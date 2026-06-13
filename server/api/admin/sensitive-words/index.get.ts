import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { sensitiveWordQuerySchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = getQuery(event)
  const result = sensitiveWordQuerySchema.safeParse(query)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { keyword, level, page, limit } = result.data

  const whereClause: any = {}
  if (keyword) whereClause.word = { contains: keyword }
  if (level) whereClause.level = level

  const [words, total] = await Promise.all([
    prisma.sensitiveWord.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.sensitiveWord.count({ where: whereClause })
  ])

  return {
    words,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
