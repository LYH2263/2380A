import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const commentId = Number(event.context.params?.commentId)

  if (!commentId || isNaN(commentId)) {
    throw createError({
      statusCode: 400,
      message: '无效的评论ID'
    })
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      chapter: {
        select: {
          novel: { select: { authorId: true } }
        }
      }
    }
  })

  if (!comment) {
    throw createError({
      statusCode: 404,
      message: '评论不存在'
    })
  }

  if (comment.chapter?.novel?.authorId !== user.userId) {
    throw createError({
      statusCode: 403,
      message: '无权操作此评论'
    })
  }

  const body = await readBody(event)
  const { action } = body

  if (!['pin', 'unpin', 'feature', 'unfeature'].includes(action)) {
    throw createError({
      statusCode: 400,
      message: '无效的操作'
    })
  }

  const updateData: any = {}
  if (action === 'pin') updateData.isPinned = true
  if (action === 'unpin') updateData.isPinned = false
  if (action === 'feature') updateData.isFeatured = true
  if (action === 'unfeature') updateData.isFeatured = false

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: updateData
  })

  return { success: true, comment: updated }
})
