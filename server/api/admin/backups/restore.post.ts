import { requireAdmin } from '~/server/utils/auth'
import novelBackupService from '~/server/utils/novelBackupService'

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: '请上传备份文件' })
  }

  const filePart = formData.find(p => p.name === 'file')
  if (!filePart || !filePart.data) {
    throw createError({ statusCode: 400, message: '请上传备份文件' })
  }

  const fileName = filePart.filename || 'backup.zip'
  if (!fileName.toLowerCase().endsWith('.zip')) {
    throw createError({ statusCode: 400, message: '仅支持 zip 格式备份文件' })
  }

  try {
    const taskId = await novelBackupService.createRestoreTask(
      Buffer.from(filePart.data),
      admin.userId,
      fileName
    )
    return { success: true, taskId }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || '创建恢复任务失败' })
  }
})
