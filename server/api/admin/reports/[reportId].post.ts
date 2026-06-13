import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const reportId = Number(event.context.params?.reportId)
  const body = await readBody(event)

  if (!reportId || isNaN(reportId)) {
    throw createError({
      statusCode: 400,
      message: '无效的举报ID'
    })
  }

  const { action } = body

  if (!['RESOLVED', 'IGNORED'].includes(action)) {
    throw createError({
      statusCode: 400,
      message: '无效的操作类型'
    })
  }

  const report = await prisma.commentReport.findUnique({
    where: { id: reportId }
  })

  if (!report) {
    throw createError({
      statusCode: 404,
      message: '举报不存在'
    })
  }

  if (action === 'RESOLVED') {
    await prisma.comment.delete({
      where: { id: report.commentId }
    })
  }

  await prisma.commentReport.update({
    where: { id: reportId },
    data: {
      status: action
    }
  })

  return { success: true }
})
