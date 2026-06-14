import prisma from './prisma'
import storage from './storage'
import taskManager from './taskManager'
import * as archiverModule from 'archiver'
import * as unzipperModule from 'unzipper'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// archiver / unzipper 是 CommonJS 模块。被 rollup 内联打包后，其导出会被包裹在
// default 上（也可能直接是命名空间本身），这里做兼容取值，避免默认导入报错。
const archiver: any = (archiverModule as any).default || archiverModule
const unzipper: any = (unzipperModule as any).default || unzipperModule

const BACKUP_VERSION = '1.0.0'
const CHUNK_SIZE = 200

export interface BackupMetadata {
  version: string
  createdAt: string
  novelId: number
  novelTitle: string
  chapterCount: number
  commentCount: number
  checksum?: string
}

export const novelBackupService = {
  async createBackupTask(novelId: number, adminId: number, note?: string): Promise<number> {
    const novel = await prisma.novel.findUnique({ where: { id: novelId } })
    if (!novel) throw new Error('小说不存在')

    const task = await taskManager.createTask('NOVEL_BACKUP', {
      adminId,
      fileName: `backup_novel_${novelId}_${Date.now()}.zip`,
      filters: { novelId, note } as any
    })

    setImmediate(() => this.executeBackup(task.id, novelId, adminId, note))
    return task.id
  },

  async executeBackup(taskId: number, novelId: number, adminId: number, note?: string) {
    try {
      await taskManager.updateTask(taskId, { status: 'PROCESSING', progress: 0 })

      const novel = await prisma.novel.findUnique({
        where: { id: novelId },
        include: { author: { select: { id: true, username: true } } }
      })
      if (!novel) throw new Error('小说不存在')

      const [chapterCount, commentCount] = await Promise.all([
        prisma.chapter.count({ where: { novelId } }),
        prisma.comment.count({ where: { chapter: { novelId } } })
      ])

      const totalItems = 1 + chapterCount + commentCount
      await taskManager.updateTask(taskId, { totalItems, progress: 5 })

      if (taskManager.isCancelled(taskId)) {
        await taskManager.updateTask(taskId, { status: 'CANCELLED' })
        return
      }

      const tempFileName = `temp_backup_${taskId}_${Date.now()}.zip`
      const tempPath = path.join(storage.getBackupPath(), tempFileName)
      const output = fs.createWriteStream(tempPath)
      const archive = archiver('zip', { zlib: { level: 9 } })

      archive.pipe(output)
      let processed = 1

      const metadata: BackupMetadata = {
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        novelId: novel.id,
        novelTitle: novel.title,
        chapterCount,
        commentCount
      }

      archive.append(
        JSON.stringify({
          ...novel,
          author: novel.author,
          _backupMetadata: metadata
        }, null, 2),
        { name: 'novel.json' }
      )

      await taskManager.updateTask(taskId, { processedItems: processed, progress: 10 })

      const commentsByChapter = new Map<number, any[]>()
      for (let skip = 0; skip < chapterCount; skip += CHUNK_SIZE) {
        if (taskManager.isCancelled(taskId)) break

        const chapters = await prisma.chapter.findMany({
          where: { novelId },
          orderBy: { order: 'asc' },
          skip, take: CHUNK_SIZE
        })

        for (const chapter of chapters) {
          archive.append(JSON.stringify(chapter, null, 2), {
            name: `chapters/chapter_${chapter.order}.json`
          })
          processed++
        }

        const prog = 10 + Math.round((processed / Math.max(totalItems, 1)) * 40)
        await taskManager.updateTask(taskId, { processedItems: processed, progress: prog })
        await taskManager.yieldToEventLoop()
      }

      await taskManager.updateTask(taskId, { progress: 50 })

      const chaptersWithComments = await prisma.chapter.findMany({
        where: { novelId },
        select: { id: true, order: true }
      })

      for (let i = 0; i < chaptersWithComments.length; i++) {
        if (taskManager.isCancelled(taskId)) break

        const chapter = chaptersWithComments[i]
        let commentSkip = 0
        let hasMore = true
        const chapterComments: any[] = []

        while (hasMore) {
          const comments = await prisma.comment.findMany({
            where: { chapterId: chapter.id },
            orderBy: { createdAt: 'asc' },
            skip: commentSkip, take: CHUNK_SIZE
          })
          chapterComments.push(...comments)
          commentSkip += CHUNK_SIZE
          hasMore = comments.length === CHUNK_SIZE
        }

        if (chapterComments.length > 0) {
          archive.append(JSON.stringify(chapterComments, null, 2), {
            name: `comments/chapter_${chapter.order}.json`
          })
        }
        processed += chapterComments.length
      }

      const prog = 50 + Math.min(40, Math.round((commentCount / Math.max(totalItems, 1)) * 40))
      await taskManager.updateTask(taskId, { processedItems: processed, progress: prog })

      await taskManager.updateTask(taskId, { progress: 95 })
      await archive.finalize()

      await new Promise<void>((resolve, reject) => {
        output.on('close', resolve)
        output.on('error', reject)
      })

      const fileSize = fs.statSync(tempPath).size
      const checksum = storage.computeChecksum(tempPath)

      const finalFileName = `novel_${novelId}_${Date.now()}.zip`
      const finalPath = path.join(storage.getBackupPath(), finalFileName)
      fs.renameSync(tempPath, finalPath)

      const backup = await prisma.novelBackup.create({
        data: {
          novelId,
          adminId,
          fileName: finalFileName,
          filePath: storage.getRelativePath(finalPath),
          fileSize,
          version: BACKUP_VERSION,
          novelTitle: novel.title,
          chapterCount,
          commentCount,
          checksum,
          note
        }
      })

      await taskManager.updateTask(taskId, {
        status: 'COMPLETED',
        progress: 100,
        filePath: storage.getRelativePath(finalPath),
        fileSize,
        fileName: finalFileName,
        downloadUrl: `/api/admin/backups/${backup.id}/download`,
        result: { backupId: backup.id, checksum } as any
      })

    } catch (err: any) {
      await taskManager.updateTask(taskId, {
        status: 'FAILED',
        errorMessage: err.message || '备份失败'
      })
    }
  },

  async createRestoreTask(buffer: Buffer, adminId: number, originalName: string): Promise<number> {
    const task = await taskManager.createTask('NOVEL_RESTORE', {
      adminId,
      fileName: originalName
    })

    const tempFile = path.join(storage.getBackupPath(), `temp_restore_${task.id}_${Date.now()}.zip`)
    fs.writeFileSync(tempFile, buffer)

    setImmediate(() => this.executeRestore(task.id, tempFile))
    return task.id
  },

  async executeRestore(taskId: number, zipFilePath: string) {
    try {
      await taskManager.updateTask(taskId, { status: 'PROCESSING', progress: 5 })

      const directory = await unzipper.Open.file(zipFilePath)
      const novelFile = directory.files.find((f: any) => f.path === 'novel.json')
      if (!novelFile) throw new Error('备份包缺少 novel.json')

      const novelContent = await novelFile.buffer()
      const novelData = JSON.parse(novelContent.toString('utf-8'))
      const metadata = novelData._backupMetadata || {}
      delete novelData._backupMetadata

      const chapterFiles = directory.files.filter((f: any) =>
        f.path.startsWith('chapters/') && f.path.endsWith('.json')
      ).sort()

      const commentFiles = directory.files.filter((f: any) =>
        f.path.startsWith('comments/') && f.path.endsWith('.json')
      )

      const totalItems = 1 + chapterFiles.length + commentFiles.length
      await taskManager.updateTask(taskId, { totalItems, progress: 10 })

      if (taskManager.isCancelled(taskId)) {
        fs.unlinkSync(zipFilePath)
        await taskManager.updateTask(taskId, { status: 'CANCELLED' })
        return
      }

      let adminUserId = novelData.authorId
      if (novelData.author?.username) {
        const existingUser = await prisma.user.findFirst({
          where: { username: { equals: novelData.author.username, mode: 'insensitive' } }
        })
        if (existingUser) adminUserId = existingUser.id
      }

      const restoredNovel = await prisma.novel.create({
        data: {
          title: `${novelData.title}（已恢复 ${new Date().toLocaleDateString('zh-CN')}）`,
          description: novelData.description,
          authorId: adminUserId,
          cover: novelData.cover,
          status: novelData.status || 'ONGOING',
          tags: novelData.tags || [],
          isFeatured: novelData.isFeatured || false,
          viewCount: novelData.viewCount || 0
        }
      })

      let processed = 1
      const restoredChapterIds = new Map<number, number>()

      for (let i = 0; i < chapterFiles.length; i++) {
        if (taskManager.isCancelled(taskId)) break

        const file = chapterFiles[i]
        const content = JSON.parse((await file.buffer()).toString('utf-8'))
        const oldOrder = content.order
        delete content.id
        delete content.novelId
        delete content._count

        const created = await prisma.chapter.create({
          data: {
            ...content,
            novelId: restoredNovel.id
          }
        })
        restoredChapterIds.set(oldOrder, created.id)

        processed++
        const prog = 10 + Math.round((processed / Math.max(totalItems, 1)) * 80)
        await taskManager.updateTask(taskId, { processedItems: processed, progress: prog })
        await taskManager.yieldToEventLoop()
      }

      await taskManager.updateTask(taskId, { progress: 85 })

      for (let i = 0; i < commentFiles.length; i++) {
        if (taskManager.isCancelled(taskId)) break

        const file = commentFiles[i]
        const match = file.path.match(/comments\/chapter_(\d+)\.json/)
        if (!match) continue
        const oldChapterOrder = Number(match[1])
        const newChapterId = restoredChapterIds.get(oldChapterOrder)
        if (!newChapterId) continue

        const comments = JSON.parse((await file.buffer()).toString('utf-8'))
        const userIdMap = new Map<number, number>()

        for (const comment of comments) {
          let newUserId = userIdMap.get(comment.userId)
          if (!newUserId) {
            const tempUser = await prisma.user.upsert({
              where: { email: `restored_user_${comment.userId}@restore.local` },
              update: {},
              create: {
                email: `restored_user_${comment.userId}_${Date.now()}_${Math.random().toString(36).slice(2)}@restore.local`,
                username: `已恢复用户_${Math.random().toString(36).slice(2, 8)}`,
                password: '$2a$10$placeholder',
                role: 'USER',
                bio: '从备份恢复的评论作者占位用户'
              }
            })
            newUserId = tempUser.id
            userIdMap.set(comment.userId, newUserId)
          }

          delete comment.id
          delete comment.chapterId
          delete comment.parentId
          await prisma.comment.create({
            data: {
              ...comment,
              userId: newUserId,
              chapterId: newChapterId,
              parentId: null
            }
          })
        }

        processed++
      }

      fs.unlinkSync(zipFilePath)

      const actualChapterCount = await prisma.chapter.count({ where: { novelId: restoredNovel.id } })
      const actualCommentCount = await prisma.comment.count({ where: { chapter: { novelId: restoredNovel.id } } })

      await taskManager.updateTask(taskId, {
        status: 'COMPLETED',
        progress: 100,
        result: {
          novelId: restoredNovel.id,
          novelTitle: restoredNovel.title,
          chapterCount: actualChapterCount,
          commentCount: actualCommentCount,
          originalNovelTitle: metadata.novelTitle
        } as any
      })

    } catch (err: any) {
      try { fs.unlinkSync(zipFilePath) } catch {}
      await taskManager.updateTask(taskId, {
        status: 'FAILED',
        errorMessage: err.message || '恢复失败'
      })
    }
  },

  async listBackups(novelId?: number, page: number = 1, pageSize: number = 20) {
    const where: any = {}
    if (novelId) where.novelId = novelId

    const [backups, total] = await Promise.all([
      prisma.novelBackup.findMany({
        where,
        include: { admin: { select: { id: true, username: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.novelBackup.count({ where })
    ])

    return { backups, total, page, pageSize }
  },

  async getBackup(backupId: number) {
    return prisma.novelBackup.findUnique({
      where: { id: backupId },
      include: { admin: { select: { id: true, username: true } }, novel: true }
    })
  },

  async deleteBackup(backupId: number): Promise<boolean> {
    const backup = await prisma.novelBackup.findUnique({ where: { id: backupId } })
    if (!backup) return false

    const absPath = storage.getAbsolutePath(backup.filePath)
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath)
    }

    await prisma.novelBackup.delete({ where: { id: backupId } })
    return true
  }
}

export default novelBackupService
