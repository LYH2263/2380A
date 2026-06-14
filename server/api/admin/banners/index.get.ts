import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { bannerQuerySchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = getQuery(event)
  const result = bannerQuerySchema.safeParse(query)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { keyword, isActive, page, limit } = result.data

  const whereClause: any = {}
  if (keyword) whereClause.title = { contains: keyword }
  if (isActive !== undefined && isActive !== '') whereClause.isActive = isActive === 'true'

  const [banners, total] = await Promise.all([
    prisma.banner.findMany({
      where: whereClause,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        createdBy: {
          select: { id: true, username: true }
        }
      }
    }),
    prisma.banner.count({ where: whereClause })
  ])

  return {
    banners,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
