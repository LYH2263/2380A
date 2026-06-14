import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const eventId = Number(getRouterParam(event, 'id'))
  if (!eventId || isNaN(eventId)) {
    throw createError({
      statusCode: 400,
      message: '无效的活动ID'
    })
  }

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20
  const status = query.status as string || ''

  const whereClause: any = { eventId }
  if (status && ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'].includes(status)) {
    whereClause.status = status
  }

  const [participations, total] = await Promise.all([
    prisma.eventParticipation.findMany({
      where: whereClause,
      orderBy: { registeredAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { id: true, username: true, email: true, avatar: true }
        },
        novel: {
          select: {
            id: true,
            title: true,
            cover: true,
            description: true,
            viewCount: true,
            status: true,
            reviewStatus: true,
            author: {
              select: { id: true, username: true, avatar: true }
            },
            _count: {
              select: { chapters: true }
            }
          }
        }
      }
    }),
    prisma.eventParticipation.count({ where: whereClause })
  ])

  return {
    participations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
