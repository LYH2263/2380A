import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { reviewHistoryQuerySchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = getQuery(event)
  const result = reviewHistoryQuerySchema.safeParse(query)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { contentType, contentId, page, limit } = result.data

  const whereClause: any = {}
  if (contentType) whereClause.contentType = contentType
  if (contentId) {
    if (contentType === 'NOVEL') whereClause.novelId = contentId
    if (contentType === 'CHAPTER') whereClause.chapterId = contentId
    if (contentType === 'COMMENT') whereClause.commentId = contentId
  }

  const [records, total] = await Promise.all([
    prisma.reviewRecord.findMany({
      where: whereClause,
      include: {
        reviewer: { select: { id: true, username: true, avatar: true } },
        novel: { select: { id: true, title: true } },
        chapter: { select: { id: true, title: true } },
        comment: { select: { id: true, content: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.reviewRecord.count({ where: whereClause })
  ])

  return {
    records,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
