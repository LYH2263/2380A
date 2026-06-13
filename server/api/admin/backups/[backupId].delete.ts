import { requireAdmin } from '~/server/utils/auth'
import novelBackupService from '~/server/utils/novelBackupService'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const backupId = Number(getRouterParam(event, 'backupId'))

  const result = await novelBackupService.deleteBackup(backupId)
  if (!result) {
    throw createError({ statusCode: 404, message: '备份不存在' })
  }

  return { success: true }
})
