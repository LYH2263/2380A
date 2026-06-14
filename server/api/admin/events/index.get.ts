import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { eventQuerySchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = getQuery(event)
  const result = eventQuerySchema.safeParse(query)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { keyword, type, status, page, limit } = result.data

  const whereClause: any = {}
  if (keyword) {
    whereClause.OR = [
      { title: { contains: keyword } },
      { description: { contains: keyword } }
    ]
  }
  if (type) whereClause.type = type
  if (status) whereClause.status = status

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: whereClause,
      orderBy: [
        { sortOrder: 'desc' },
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: {
            participations: true
          }
        }
      }
    }),
    prisma.event.count({ where: whereClause })
  ])

  return {
    events,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
