import prisma from './prisma'
import type { TaskType, TaskStatus } from '@prisma/client'

export interface TaskUpdate {
  progress?: number
  processedItems?: number
  totalItems?: number
  status?: TaskStatus
  result?: any
  errorMessage?: string
  fileName?: string
  filePath?: string
  fileSize?: number
  downloadUrl?: string
}

const activeTasks = new Map<number, { cancelled: boolean }>()

export const taskManager = {
  async createTask(
    type: TaskType,
    opts: {
      userId?: number
      adminId?: number
      fileName?: string
      filters?: any
      fields?: string[]
      expiresAt?: Date
    } = {}
  ) {
    const task = await prisma.importExportTask.create({
      data: {
        type,
        status: 'PENDING',
        userId: opts.userId,
        adminId: opts.adminId,
        fileName: opts.fileName,
        filters: opts.filters ? JSON.stringify(opts.filters) : undefined,
        fields: opts.fields ? JSON.stringify(opts.fields) : undefined,
        expiresAt: opts.expiresAt
      }
    })

    activeTasks.set(task.id, { cancelled: false })
    return task
  },

  async updateTask(taskId: number, update: TaskUpdate) {
    const data: any = {}
    if (update.progress !== undefined) data.progress = update.progress
    if (update.processedItems !== undefined) data.processedItems = update.processedItems
    if (update.totalItems !== undefined) data.totalItems = update.totalItems
    if (update.status !== undefined) data.status = update.status
    if (update.result !== undefined) data.result = typeof update.result === 'string' ? update.result : JSON.stringify(update.result)
    if (update.errorMessage !== undefined) data.errorMessage = update.errorMessage
    if (update.fileName !== undefined) data.fileName = update.fileName
    if (update.filePath !== undefined) data.filePath = update.filePath
    if (update.fileSize !== undefined) data.fileSize = update.fileSize
    if (update.downloadUrl !== undefined) data.downloadUrl = update.downloadUrl
    if (update.status === 'COMPLETED' || update.status === 'FAILED' || update.status === 'CANCELLED') {
      data.completedAt = new Date()
    }

    const task = await prisma.importExportTask.update({
      where: { id: taskId },
      data
    })

    if (task.status === 'COMPLETED' || task.status === 'FAILED' || task.status === 'CANCELLED') {
      activeTasks.delete(taskId)
    }

    return task
  },

  cancelTask(taskId: number) {
    const task = activeTasks.get(taskId)
    if (task) {
      task.cancelled = true
    }
  },

  isCancelled(taskId: number): boolean {
    const task = activeTasks.get(taskId)
    return task?.cancelled ?? false
  },

  async getTask(taskId: number, includeRelation: boolean = false) {
    return prisma.importExportTask.findUnique({
      where: { id: taskId },
      include: includeRelation ? { user: true, admin: true } : undefined
    })
  },

  async getUserTasks(userId: number, limit: number = 20) {
    return prisma.importExportTask.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  },

  async getAdminTasks(adminId: number, limit: number = 50) {
    return prisma.importExportTask.findMany({
      where: { OR: [{ adminId }, { userId: undefined }] },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  },

  async getActiveTasks() {
    return prisma.importExportTask.findMany({
      where: { status: { in: ['PENDING', 'PROCESSING'] } },
      orderBy: { createdAt: 'asc' }
    })
  },

  async deleteTask(taskId: number) {
    return prisma.importExportTask.delete({ where: { id: taskId } })
  },

  calculateProgress(processed: number, total: number): number {
    if (total <= 0) return 0
    return Math.min(100, Math.round((processed / total) * 100))
  },

  async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  async yieldToEventLoop() {
    await new Promise(setImmediate)
  },

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }
}

export default taskManager
