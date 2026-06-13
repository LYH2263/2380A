import { requireAuth } from '~/server/utils/auth'
import taskManager from '~/server/utils/taskManager'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const taskId = Number(getRouterParam(event, 'taskId'))

  const task = await taskManager.getTask(taskId)
  if (!task) {
    throw createError({ statusCode: 404, message: '任务不存在' })
  }
  if (task.userId !== user.userId && task.adminId !== user.userId) {
    throw createError({ statusCode: 403, message: '无权取消此任务' })
  }

  if (task.status === 'COMPLETED' || task.status === 'FAILED' || task.status === 'CANCELLED') {
    return { success: true, message: '任务已结束' }
  }

  taskManager.cancelTask(taskId)
  await taskManager.updateTask(taskId, { status: 'CANCELLED' })

  return { success: true, message: '任务已取消' }
})
