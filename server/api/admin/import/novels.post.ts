import { requireAdmin } from '~/server/utils/auth'
import novelImportService from '~/server/utils/novelImportService'

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: '请上传文件' })
  }

  const filePart = formData.find(p => p.name === 'file')
  if (!filePart || !filePart.data) {
    throw createError({ statusCode: 400, message: '请上传文件' })
  }

  const fileName = filePart.filename || 'novels.xlsx'
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
    throw createError({ statusCode: 400, message: '仅支持 xlsx, xls, csv 格式文件' })
  }

  try {
    const taskId = await novelImportService.createImportTask(
      Buffer.from(filePart.data),
      admin.userId,
      fileName
    )
    return { success: true, taskId, fileName }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || '创建导入任务失败' })
  }
})
