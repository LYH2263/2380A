import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { commentReplySchema } from '~/server/utils/validators'

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
          novelId: true,
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
      message: '无权回复此评论'
    })
  }

  const body = await readBody(event)
  const result = commentReplySchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const reply = await prisma.comment.create({
    data: {
      userId: user.userId,
      chapterId: comment.chapterId,
      content: result.data.content,
      parentId: commentId
    },
    include: {
      user: { select: { id: true, username: true, avatar: true } }
    }
  })

  return { success: true, reply }
})
