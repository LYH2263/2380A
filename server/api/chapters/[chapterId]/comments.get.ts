import prisma from '~/server/utils/prisma'
import { getAuthUser } from '~/server/utils/auth'
import { commentQuerySchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const chapterId = Number(event.context.params?.chapterId)
  const query = getQuery(event)

  if (!chapterId || isNaN(chapterId)) {
    throw createError({
      statusCode: 400,
      message: '无效的章节ID'
    })
  }

  const result = commentQuerySchema.safeParse(query)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { sort, page, limit, paragraph } = result.data
  const user = getAuthUser(event)

  const where: any = {
    chapterId,
    parentId: null
  }

  if (paragraph !== undefined) {
    where.paragraph = paragraph
  }

  let orderBy: any = {}
  if (sort === 'newest') {
    orderBy = { createdAt: 'desc' }
  } else if (sort === 'oldest') {
    orderBy = { createdAt: 'asc' }
  } else if (sort === 'hot') {
    orderBy = [
      { likes: { _count: 'desc' } },
      { replies: { _count: 'desc' } },
      { createdAt: 'desc' }
    ]
  }

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { id: true, username: true, avatar: true }
        },
        likes: {
          select: { userId: true }
        },
        _count: {
          select: { likes: true, replies: true }
        },
        replies: {
          include: {
            user: {
              select: { id: true, username: true, avatar: true }
            },
            likes: {
              select: { userId: true }
            },
            _count: {
              select: { likes: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy
    }),
    prisma.comment.count({ where })
  ])

  const formattedComments = comments.map(comment => {
    const formattedReplies = comment.replies.map(reply => ({
      ...reply,
      likeCount: reply._count.likes,
      isLiked: user ? reply.likes.some(l => l.userId === user.userId) : false,
      likes: undefined,
      _count: undefined
    }))

    return {
      ...comment,
      likeCount: comment._count.likes,
      replyCount: comment._count.replies,
      isLiked: user ? comment.likes.some(l => l.userId === user.userId) : false,
      likes: undefined,
      _count: undefined,
      replies: formattedReplies
    }
  })

  return {
    comments: formattedComments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
