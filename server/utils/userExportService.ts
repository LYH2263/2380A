import prisma from './prisma'
import storage from './storage'
import taskManager from './taskManager'

export interface UserExportData {
  exportInfo: {
    version: string
    exportedAt: string
    user: { id: number; username: string; email: string }
  }
  favorites: any[]
  readHistory: any[]
  comments: any[]
  ratings: any[]
}

const EXPORT_VERSION = '1.0.0'
const CHUNK_SIZE = 500

export const userExportService = {
  async createExportTask(userId: number): Promise<number> {
    const fileName = storage.generateFileName(`user_${userId}_data`, 'json')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const task = await taskManager.createTask('USER_DATA_EXPORT', {
      userId,
      fileName,
      expiresAt
    })

    setImmediate(() => this.executeExport(task.id, userId))

    return task.id
  },

  async executeExport(taskId: number, userId: number) {
    try {
      await taskManager.updateTask(taskId, { status: 'PROCESSING', progress: 0 })

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, email: true }
      })
      if (!user) throw new Error('用户不存在')

      const total = await this.getTotalCounts(userId)
      const totalItems = total.favorites + total.history + total.comments + total.ratings
      await taskManager.updateTask(taskId, { totalItems, progress: 5 })

      let processed = 0
      const result: UserExportData = {
        exportInfo: {
          version: EXPORT_VERSION,
          exportedAt: new Date().toISOString(),
          user: { id: user.id, username: user.username, email: user.email }
        },
        favorites: [],
        readHistory: [],
        comments: [],
        ratings: []
      }

      if (taskManager.isCancelled(taskId)) {
        await taskManager.updateTask(taskId, { status: 'CANCELLED' })
        return
      }

      result.favorites = await this.fetchWithPagination(
        (skip, take) => prisma.favorite.findMany({
          where: { userId },
          include: {
            novel: {
              select: { id: true, title: true, author: { select: { username: true } }, cover: true, status: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip, take
        }),
        total.favorites, CHUNK_SIZE,
        (count) => {
          processed += count
          const progress = 5 + Math.round((processed / Math.max(totalItems, 1)) * 70)
          taskManager.updateTask(taskId, { processedItems: processed, progress })
        },
        taskId
      )

      if (taskManager.isCancelled(taskId)) {
        await taskManager.updateTask(taskId, { status: 'CANCELLED' })
        return
      }

      result.readHistory = await this.fetchWithPagination(
        (skip, take) => prisma.readHistory.findMany({
          where: { userId },
          include: {
            novel: { select: { id: true, title: true } },
          },
          orderBy: { updatedAt: 'desc' },
          skip, take
        }),
        total.history, CHUNK_SIZE,
        (count) => {
          processed += count
          const progress = 5 + Math.round((processed / Math.max(totalItems, 1)) * 70)
          taskManager.updateTask(taskId, { processedItems: processed, progress })
        },
        taskId
      )

      if (taskManager.isCancelled(taskId)) {
        await taskManager.updateTask(taskId, { status: 'CANCELLED' })
        return
      }

      result.comments = await this.fetchWithPagination(
        (skip, take) => prisma.comment.findMany({
          where: { userId },
          include: {
            chapter: { select: { id: true, title: true, novelId: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip, take
        }),
        total.comments, CHUNK_SIZE,
        (count) => {
          processed += count
          const progress = 5 + Math.round((processed / Math.max(totalItems, 1)) * 70)
          taskManager.updateTask(taskId, { processedItems: processed, progress })
        },
        taskId
      )

      if (taskManager.isCancelled(taskId)) {
        await taskManager.updateTask(taskId, { status: 'CANCELLED' })
        return
      }

      result.ratings = await this.fetchWithPagination(
        (skip, take) => prisma.rating.findMany({
          where: { userId },
          include: {
            novel: { select: { id: true, title: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip, take
        }),
        total.ratings, CHUNK_SIZE,
        (count) => {
          processed += count
          const progress = 5 + Math.round((processed / Math.max(totalItems, 1)) * 70)
          taskManager.updateTask(taskId, { processedItems: processed, progress })
        },
        taskId
      )

      await taskManager.updateTask(taskId, { progress: 80 })

      const jsonStr = JSON.stringify(result, null, 2)
      const { filePath, fileSize } = storage.saveExport(`task_${taskId}.json`, jsonStr)

      await taskManager.updateTask(taskId, {
        status: 'COMPLETED',
        progress: 100,
        filePath: storage.getRelativePath(filePath),
        fileSize,
        fileName: `user_data_${user.username}_${Date.now()}.json`,
        downloadUrl: `/api/export/download/${taskId}`,
        result: {
          summary: {
            favorites: result.favorites.length,
            readHistory: result.readHistory.length,
            comments: result.comments.length,
            ratings: result.ratings.length
          }
        }
      })

    } catch (err: any) {
      await taskManager.updateTask(taskId, {
        status: 'FAILED',
        errorMessage: err.message || '导出失败'
      })
    }
  },

  async fetchWithPagination<T>(
    fetcher: (skip: number, take: number) => Promise<T[]>,
    total: number,
    pageSize: number,
    onProgress: (count: number) => void,
    taskId: number
  ): Promise<T[]> {
    const results: T[] = []
    let skip = 0

    while (skip < total) {
      if (taskManager.isCancelled(taskId)) break
      const chunk = await fetcher(skip, pageSize)
      results.push(...chunk)
      skip += pageSize
      onProgress(chunk.length)
      await taskManager.yieldToEventLoop()
    }

    return results
  },

  async getTotalCounts(userId: number) {
    const [favorites, history, comments, ratings] = await Promise.all([
      prisma.favorite.count({ where: { userId } }),
      prisma.readHistory.count({ where: { userId } }),
      prisma.comment.count({ where: { userId } }),
      prisma.rating.count({ where: { userId } })
    ])
    return { favorites, history, comments, ratings }
  }
}

export default userExportService
