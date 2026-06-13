import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { commentEditSchema } from '~/server/utils/validators'
import { extractMentionsFromContent } from '~/server/utils/commentUtils'

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

  const result = commentEditSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { content } = result.data

  const comment = await prisma.comment.findUnique({
    where: { id: commentId }
  })

  if (!comment) {
    throw createError({
      statusCode: 404,
      message: '评论不存在'
    })
  }

  if (comment.userId !== user.userId) {
    throw createError({
      statusCode: 403,
      message: '无权编辑此评论'
    })
  }

  const createdAt = new Date(comment.createdAt).getTime()
  const now = Date.now()
  const fiveMinutes = 5 * 60 * 1000

  if (now - createdAt > fiveMinutes) {
    throw createError({
      statusCode: 400,
      message: '评论发布超过5分钟，无法编辑'
    })
  }

  const mentionedUsernames = extractMentionsFromContent(content)
  const mentionedUsers = mentionedUsernames.length > 0
    ? await prisma.user.findMany({
        where: { username: { in: mentionedUsernames } },
        select: { id: true, username: true }
      })
    : []

  const updatedComment = await prisma.comment.update({
    where: { id: commentId },
    data: {
      content,
      isEdited: true,
      mentions: {
        deleteMany: {},
        create: mentionedUsers.map(u => ({
          userId: u.id
        }))
      }
    },
    include: {
      user: {
        select: { id: true, username: true, avatar: true }
      }
    }
  })

  return { success: true, comment: updatedComment }
})
