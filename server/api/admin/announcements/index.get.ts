import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { announcementQuerySchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = getQuery(event)
  const result = announcementQuerySchema.safeParse(query)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { keyword, priority, isActive, page, limit } = result.data

  const whereClause: any = {}
  if (keyword) {
    whereClause.OR = [
      { title: { contains: keyword } },
      { content: { contains: keyword } }
    ]
  }
  if (priority) whereClause.priority = priority
  if (isActive !== undefined && isActive !== '') {
    whereClause.isActive = isActive === 'true'
  }

  const [announcements, total] = await Promise.all([
    prisma.announcement.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: { id: true, username: true, email: true }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.announcement.count({ where: whereClause })
  ])

  return {
    announcements,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
