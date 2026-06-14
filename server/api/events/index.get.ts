import prisma from '~/server/utils/prisma'
import { eventQuerySchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const result = eventQuerySchema.safeParse(query)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { keyword, type, status, page, limit } = result.data

  const whereClause: any = {
    status: {
      not: 'DRAFT'
    }
  }
  if (status) {
    whereClause.status = status
  }
  if (keyword) {
    whereClause.OR = [
      { title: { contains: keyword } },
      { description: { contains: keyword } }
    ]
  }
  if (type) whereClause.type = type

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: whereClause,
      orderBy: [
        { sortOrder: 'desc' },
        { eventStartAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: {
            participations: {
              where: {
                status: {
                  in: ['APPROVED', 'PENDING']
                }
              }
            }
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
