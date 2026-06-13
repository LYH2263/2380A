import { requireAdmin } from '~/server/utils/auth'
import novelBackupService from '~/server/utils/novelBackupService'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const query = getQuery(event)
  const novelId = query.novelId ? Number(query.novelId) : undefined
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  const result = await novelBackupService.listBackups(novelId, page, pageSize)

  return {
    backups: result.backups,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize
  }
})
