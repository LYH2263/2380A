import { requireAuth } from '~/server/utils/auth'
import userExportService from '~/server/utils/userExportService'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)

  try {
    const taskId = await userExportService.createExportTask(user.userId)
    return { success: true, taskId }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || '创建导出任务失败'
    })
  }
})
