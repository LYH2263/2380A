import { requireAuth } from '~/server/utils/auth'
import taskManager from '~/server/utils/taskManager'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const tasks = await taskManager.getUserTasks(user.userId, 50)

  return {
    tasks: tasks.map(t => ({
      id: t.id,
      type: t.type,
      status: t.status,
      progress: t.progress,
      totalItems: t.totalItems,
      processedItems: t.processedItems,
      fileName: t.fileName,
      fileSize: t.fileSize,
      downloadUrl: t.downloadUrl,
      errorMessage: t.errorMessage,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      expiresAt: t.expiresAt
    }))
  }
})
