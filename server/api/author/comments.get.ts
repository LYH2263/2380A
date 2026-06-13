import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20
  const novelId = query.novelId ? Number(query.novelId) : null
  const onlyUnreplied = query.onlyUnreplied === 'true'

  const authorNovels = await prisma.novel.findMany({
    where: {
      authorId: user.userId,
      ...(novelId ? { id: novelId } : {})
    },
    select: { id: true, title: true }
  })
  const novelIds = authorNovels.map(n => n.id)

  if (novelIds.length === 0) {
    return {
      comments: [],
      novels: authorNovels,
      pagination: { page, limit, total: 0, totalPages: 0 }
    }
  }

  const where: any = {
    chapter: { novelId: { in: novelIds } }
  }

  if (onlyUnreplied) {
    where.OR = [
      { parentId: null, replies: { none: {} } },
      { parentId: { not: null } }
    ]
    where.parentId = null
  }

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        chapter: {
          select: {
            id: true,
            title: true,
            order: true,
            novelId: true
          }
        },
        replies: {
          include: {
            user: { select: { id: true, username: true, avatar: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: { select: { likes: true } }
      },
      orderBy: [
        { isPinned: 'desc' },
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.comment.count({ where })
  ])

  const commentsWithNovel = comments.map(comment => {
    const novel = authorNovels.find(n => n.id === comment.chapter?.novelId)
    return {
      ...comment,
      novel
    }
  })

  return {
    comments: commentsWithNovel,
    novels: authorNovels,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
