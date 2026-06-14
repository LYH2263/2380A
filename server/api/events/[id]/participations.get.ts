import prisma from '~/server/utils/prisma'
import { getAuthUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const eventId = Number(getRouterParam(event, 'id'))
  if (!eventId || isNaN(eventId)) {
    throw createError({
      statusCode: 400,
      message: '无效的活动ID'
    })
  }

  const user = getAuthUser(event)
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20
  const sortBy = (query.sortBy as string) || 'voteCount'
  const sortOrder = (query.sortOrder as string) || 'desc'

  const validSortFields = ['voteCount', 'viewCount', 'registeredAt']
  if (!validSortFields.includes(sortBy)) {
    throw createError({
      statusCode: 400,
      message: '无效的排序字段'
    })
  }

  const eventData = await prisma.event.findUnique({ where: { id: eventId } })
  if (!eventData) {
    throw createError({
      statusCode: 404,
      message: '活动不存在'
    })
  }

  if (eventData.status === 'DRAFT') {
    throw createError({
      statusCode: 404,
      message: '活动不存在'
    })
  }

  const whereClause: any = {
    eventId,
    status: 'APPROVED'
  }

  const orderBy: any = {}
  orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc'

  const include: any = {
    user: {
      select: { id: true, username: true, avatar: true }
    },
    novel: {
      select: {
        id: true,
        title: true,
        cover: true,
        description: true,
        viewCount: true,
        author: {
          select: { id: true, username: true, avatar: true }
        },
        _count: {
          select: { chapters: true }
        }
      }
    }
  }

  if (user) {
    include.eventVotes = {
      where: { userId: user.userId },
      select: { id: true }
    }
  }

  const [participations, total] = await Promise.all([
    prisma.eventParticipation.findMany({
      where: whereClause,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include
    }),
    prisma.eventParticipation.count({ where: whereClause })
  ])

  const participationsWithVoted = participations.map(p => ({
    ...p,
    hasVoted: user ? (p as any).eventVotes?.length > 0 : false,
    eventVotes: undefined
  }))

  return {
    participations: participationsWithVoted,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
