import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10
  const status = query.status as string || ''

  const where: any = { authorId: user.userId }
  if (status && ['ONGOING', 'COMPLETED', 'HIATUS'].includes(status)) {
    where.status = status
  }

  const [novels, total] = await Promise.all([
    prisma.novel.findMany({
      where,
      include: {
        _count: {
          select: {
            chapters: true,
            favorites: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.novel.count({ where })
  ])

  const novelsWithStats = await Promise.all(
    novels.map(async (novel) => {
      const commentCount = await prisma.comment.count({
        where: { chapter: { novelId: novel.id } }
      })
      return {
        ...novel,
        commentCount
      }
    })
  )

  return {
    novels: novelsWithStats,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
