import { requireAdmin } from '~/server/utils/auth'
import adminExportService, { AdminExportOptions } from '~/server/utils/adminExportService'

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const body = await readBody(event)

  const exportType = getRouterParam(event, 'type') as 'novels' | 'users' | 'comments'
  if (!['novels', 'users', 'comments'].includes(exportType)) {
    throw createError({ statusCode: 400, message: '无效的导出类型' })
  }

  const options: AdminExportOptions = {
    fields: body.fields,
    filters: body.filters || {}
  }

  try {
    const taskId = await adminExportService.createExportTask(exportType, admin.userId, options)
    return { success: true, taskId, exportType }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || '创建导出任务失败' })
  }
})
