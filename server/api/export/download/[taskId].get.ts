import { getAuthUser, requireAdmin, requireAuth } from '~/server/utils/auth'
import taskManager from '~/server/utils/taskManager'
import storage from '~/server/utils/storage'

export default defineEventHandler(async (event) => {
  const authUser = getAuthUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, message: '请先登录' })
  }

  const taskId = Number(getRouterParam(event, 'taskId'))
  const task = await taskManager.getTask(taskId)

  if (!task) {
    throw createError({ statusCode: 404, message: '任务不存在' })
  }

  if (task.userId !== authUser.userId && task.adminId !== authUser.userId && authUser.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: '无权下载此文件' })
  }

  if (task.status !== 'COMPLETED' || !task.filePath) {
    throw createError({ statusCode: 400, message: '任务未完成或文件不存在' })
  }

  if (task.expiresAt && task.expiresAt < new Date()) {
    throw createError({ statusCode: 410, message: '文件已过期' })
  }

  const absPath = storage.getAbsolutePath(task.filePath)
  if (!storage.fileExists(absPath)) {
    throw createError({ statusCode: 404, message: '文件不存在或已被清理' })
  }

  const fileName = task.fileName || `export_${taskId}`

  setHeader(event, 'Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`)
  setHeader(event, 'Cache-Control', 'no-cache')

  const fileBuffer = storage.readFile(absPath)
  return fileBuffer
})
