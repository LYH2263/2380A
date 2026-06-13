import { requireAdmin } from '~/server/utils/auth'
import novelBackupService from '~/server/utils/novelBackupService'

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const novelId = Number(getRouterParam(event, 'novelId'))
  const body = await readBody(event)

  try {
    const taskId = await novelBackupService.createBackupTask(novelId, admin.userId, body?.note)
    return { success: true, taskId }
  } catch (err: any) {
    if (err.message === '小说不存在') {
      throw createError({ statusCode: 404, message: err.message })
    }
    throw createError({ statusCode: 500, message: err.message || '创建备份任务失败' })
  }
})
