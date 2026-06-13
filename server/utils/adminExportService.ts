import prisma from './prisma'
import storage from './storage'
import taskManager from './taskManager'
import excelUtils, { ExportColumn } from './excel'

export type AdminExportType = 'novels' | 'users' | 'comments'

export interface AdminExportOptions {
  fields?: string[]
  filters?: {
    keyword?: string
    status?: string
    dateFrom?: string
    dateTo?: string
    isFeatured?: boolean
    role?: string
  }
}

const CHUNK_SIZE = 1000

export const novelExportColumns: ExportColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: '标题' },
  { key: 'description', label: '简介' },
  { key: 'authorName', label: '作者' },
  { key: 'status', label: '状态' },
  { key: 'tags', label: '标签', format: (v) => Array.isArray(v) ? v.join(', ') : v },
  { key: 'viewCount', label: '浏览量' },
  { key: 'isFeatured', label: '是否推荐', format: (v) => v ? '是' : '否' },
  { key: 'chapterCount', label: '章节数' },
  { key: 'favoriteCount', label: '收藏数' },
  { key: 'ratingAvg', label: '平均评分', format: (v) => v ? Number(v).toFixed(2) : '-' },
  { key: 'createdAt', label: '创建时间', format: (v) => v ? new Date(v).toLocaleString('zh-CN') : '' },
  { key: 'updatedAt', label: '更新时间', format: (v) => v ? new Date(v).toLocaleString('zh-CN') : '' }
]

export const userExportColumns: ExportColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'username', label: '用户名' },
  { key: 'email', label: '邮箱' },
  { key: 'role', label: '角色' },
  { key: 'bio', label: '简介' },
  { key: 'favoriteCount', label: '收藏数' },
  { key: 'novelCount', label: '作品数' },
  { key: 'commentCount', label: '评论数' },
  { key: 'createdAt', label: '注册时间', format: (v) => v ? new Date(v).toLocaleString('zh-CN') : '' }
]

export const commentExportColumns: ExportColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'username', label: '评论用户' },
  { key: 'novelTitle', label: '小说名称' },
  { key: 'chapterTitle', label: '章节标题' },
  { key: 'content', label: '评论内容' },
  { key: 'paragraph', label: '段落索引' },
  { key: 'likeCount', label: '点赞数' },
  { key: 'isPinned', label: '是否置顶', format: (v) => v ? '是' : '否' },
  { key: 'isEdited', label: '是否编辑过', format: (v) => v ? '是' : '否' },
  { key: 'createdAt', label: '评论时间', format: (v) => v ? new Date(v).toLocaleString('zh-CN') : '' }
]

export const adminExportService = {
  async createExportTask(
    exportType: AdminExportType,
    adminId: number,
    options: AdminExportOptions = {}
  ): Promise<number> {
    const typeMap = {
      novels: 'ADMIN_NOVEL_EXPORT',
      users: 'ADMIN_USER_EXPORT',
      comments: 'ADMIN_COMMENT_EXPORT'
    } as const

    const fileName = storage.generateFileName(`admin_${exportType}`, 'xlsx')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const task = await taskManager.createTask(typeMap[exportType], {
      adminId,
      fileName,
      filters: options.filters,
      fields: options.fields,
      expiresAt
    })

    setImmediate(() => this.executeExport(task.id, exportType, options))

    return task.id
  },

  async executeExport(taskId: number, exportType: AdminExportType, options: AdminExportOptions) {
    try {
      await taskManager.updateTask(taskId, { status: 'PROCESSING', progress: 0 })

      const columns = this.getColumns(exportType, options.fields)
      const totalItems = await this.getTotalCount(exportType, options.filters)
      await taskManager.updateTask(taskId, { totalItems, progress: 5 })

      if (taskManager.isCancelled(taskId)) {
        await taskManager.updateTask(taskId, { status: 'CANCELLED' })
        return
      }

      const allRows: any[] = []
      let processed = 0

      for (let skip = 0; skip < totalItems; skip += CHUNK_SIZE) {
        if (taskManager.isCancelled(taskId)) break

        const chunk = await this.fetchChunk(exportType, skip, CHUNK_SIZE, options.filters)
        allRows.push(...chunk)
        processed += chunk.length

        const progress = 5 + Math.round((processed / Math.max(totalItems, 1)) * 75)
        await taskManager.updateTask(taskId, { processedItems: processed, progress })
        await taskManager.yieldToEventLoop()
      }

      if (taskManager.isCancelled(taskId)) {
        await taskManager.updateTask(taskId, { status: 'CANCELLED' })
        return
      }

      await taskManager.updateTask(taskId, { progress: 85 })

      const buffer = excelUtils.exportToExcel(allRows, columns, this.getSheetName(exportType))
      const { filePath, fileSize } = storage.saveExport(`task_${taskId}.xlsx`, buffer)

      const dateStr = new Date().toISOString().split('T')[0]
      await taskManager.updateTask(taskId, {
        status: 'COMPLETED',
        progress: 100,
        filePath: storage.getRelativePath(filePath),
        fileSize,
        fileName: `${exportType}_export_${dateStr}.xlsx`,
        downloadUrl: `/api/export/download/${taskId}`,
        result: { totalRows: allRows.length, columns: columns.map(c => c.key) }
      })

    } catch (err: any) {
      await taskManager.updateTask(taskId, {
        status: 'FAILED',
        errorMessage: err.message || '导出失败'
      })
    }
  },

  getColumns(exportType: AdminExportType, selectedFields?: string[]): ExportColumn[] {
    let columns: ExportColumn[]
    switch (exportType) {
      case 'novels': columns = novelExportColumns; break
      case 'users': columns = userExportColumns; break
      case 'comments': columns = commentExportColumns; break
    }
    if (selectedFields && selectedFields.length > 0) {
      return columns.filter(c => selectedFields.includes(c.key))
    }
    return columns
  },

  getSheetName(exportType: AdminExportType): string {
    const map = { novels: '小说列表', users: '用户列表', comments: '评论列表' }
    return map[exportType]
  },

  buildWhere(exportType: AdminExportType, filters?: AdminExportOptions['filters']): any {
    const where: any = {}
    if (!filters) return where

    if (filters.keyword) {
      if (exportType === 'novels') {
        where.OR = [{ title: { contains: filters.keyword } }, { description: { contains: filters.keyword } }]
      } else if (exportType === 'users') {
        where.OR = [{ username: { contains: filters.keyword } }, { email: { contains: filters.keyword } }]
      } else if (exportType === 'comments') {
        where.content = { contains: filters.keyword }
      }
    }

    if (filters.status && exportType === 'novels') {
      where.status = filters.status
    }
    if (filters.role && exportType === 'users') {
      where.role = filters.role
    }
    if (filters.isFeatured !== undefined && exportType === 'novels') {
      where.isFeatured = filters.isFeatured
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom)
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo + 'T23:59:59')
    }

    return where
  },

  async getTotalCount(exportType: AdminExportType, filters?: AdminExportOptions['filters']): Promise<number> {
    const where = this.buildWhere(exportType, filters)
    switch (exportType) {
      case 'novels': return prisma.novel.count({ where })
      case 'users': return prisma.user.count({ where })
      case 'comments': return prisma.comment.count({ where })
    }
  },

  async fetchChunk(exportType: AdminExportType, skip: number, take: number, filters?: AdminExportOptions['filters']): Promise<any[]> {
    const where = this.buildWhere(exportType, filters)

    switch (exportType) {
      case 'novels': {
        const novels = await prisma.novel.findMany({
          where, skip, take,
          include: {
            author: { select: { username: true } },
            _count: { select: { chapters: true, favorites: true, ratings: true } }
          },
          orderBy: { createdAt: 'desc' }
        })
        return novels.map(n => ({
          id: n.id,
          title: n.title,
          description: n.description,
          authorName: n.author?.username,
          status: n.status,
          tags: n.tags,
          viewCount: n.viewCount,
          isFeatured: n.isFeatured,
          chapterCount: n._count.chapters,
          favoriteCount: n._count.favorites,
          ratingAvg: n._count.ratings > 0 ? (n.ratings?.reduce((s, r) => s + r.score, 0) / n._count.ratings) : 0,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt
        }))
      }
      case 'users': {
        const users = await prisma.user.findMany({
          where, skip, take,
          include: { _count: { select: { favorites: true, novels: true, comments: true } } },
          orderBy: { createdAt: 'desc' }
        })
        return users.map(u => ({
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          bio: u.bio,
          favoriteCount: u._count.favorites,
          novelCount: u._count.novels,
          commentCount: u._count.comments,
          createdAt: u.createdAt
        }))
      }
      case 'comments': {
        const comments = await prisma.comment.findMany({
          where, skip, take,
          include: {
            user: { select: { username: true } },
            chapter: { select: { title: true, novel: { select: { title: true } } } },
            _count: { select: { likes: true } }
          },
          orderBy: { createdAt: 'desc' }
        })
        return comments.map(c => ({
          id: c.id,
          username: c.user?.username,
          novelTitle: c.chapter?.novel?.title,
          chapterTitle: c.chapter?.title,
          content: c.content,
          paragraph: c.paragraph,
          likeCount: c._count.likes,
          isPinned: c.isPinned,
          isEdited: c.isEdited,
          createdAt: c.createdAt
        }))
      }
    }
  },

  getExportableFields(exportType: AdminExportType): { key: string; label: string }[] {
    let columns: ExportColumn[]
    switch (exportType) {
      case 'novels': columns = novelExportColumns; break
      case 'users': columns = userExportColumns; break
      case 'comments': columns = commentExportColumns; break
    }
    return columns.map(c => ({ key: c.key, label: c.label }))
  }
}

export default adminExportService
