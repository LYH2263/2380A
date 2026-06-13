import { requireAdmin } from '~/server/utils/auth'
import adminExportService from '~/server/utils/adminExportService'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const exportType = getRouterParam(event, 'type') as 'novels' | 'users' | 'comments'

  if (!['novels', 'users', 'comments'].includes(exportType)) {
    throw createError({ statusCode: 400, message: '无效的导出类型' })
  }

  const fields = adminExportService.getExportableFields(exportType)
  return { fields }
})
