import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { commentReportSchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const commentId = Number(event.context.params?.commentId)
  const body = await readBody(event)

  if (!commentId || isNaN(commentId)) {
    throw createError({
      statusCode: 400,
      message: '无效的评论ID'
    })
  }

  const result = commentReportSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { type, reason } = result.data

  const comment = await prisma.comment.findUnique({
    where: { id: commentId }
  })

  if (!comment) {
    throw createError({
      statusCode: 404,
      message: '评论不存在'
    })
  }

  const report = await prisma.commentReport.create({
    data: {
      userId: user.userId,
      commentId,
      type,
      reason
    }
  })

  return { success: true, report }
})
