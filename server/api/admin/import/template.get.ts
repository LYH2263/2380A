import { requireAdmin } from '~/server/utils/auth'
import novelImportService from '~/server/utils/novelImportService'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const buffer = novelImportService.getTemplateBuffer()
  const fileName = '小说批量导入模板.xlsx'

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`)

  return buffer
})
