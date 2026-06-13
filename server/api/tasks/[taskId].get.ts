import { requireAuth } from '~/server/utils/auth'
import taskManager from '~/server/utils/taskManager'
import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const taskId = Number(getRouterParam(event, 'taskId'))

  const task = await taskManager.getTask(taskId)
  if (!task) {
    throw createError({ statusCode: 404, message: '任务不存在' })
  }
  if (task.userId !== user.userId && task.adminId !== user.userId) {
    throw createError({ statusCode: 403, message: '无权访问此任务' })
  }

  return {
    task: {
      id: task.id,
      type: task.type,
      status: task.status,
      progress: task.progress,
      totalItems: task.totalItems,
      processedItems: task.processedItems,
      fileName: task.fileName,
      fileSize: task.fileSize,
      downloadUrl: task.downloadUrl,
      errorMessage: task.errorMessage,
      result: task.result ? JSON.parse(task.result) : null,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      completedAt: task.completedAt,
      expiresAt: task.expiresAt
    }
  }
})
