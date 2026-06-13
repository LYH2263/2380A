import { requireAdmin } from '~/server/utils/auth'
import novelBackupService from '~/server/utils/novelBackupService'
import storage from '~/server/utils/storage'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const backupId = Number(getRouterParam(event, 'backupId'))

  const backup = await novelBackupService.getBackup(backupId)
  if (!backup) {
    throw createError({ statusCode: 404, message: '备份不存在' })
  }

  const absPath = storage.getAbsolutePath(backup.filePath)
  if (!storage.fileExists(absPath)) {
    throw createError({ statusCode: 404, message: '备份文件不存在或已被清理' })
  }

  setHeader(event, 'Content-Type', 'application/zip')
  setHeader(event, 'Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(backup.fileName)}`)

  return storage.readFile(absPath)
})
