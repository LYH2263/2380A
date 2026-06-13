import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { reviewQueueQuerySchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = getQuery(event)
  const result = reviewQueueQuerySchema.safeParse(query)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { contentType, status, startDate, endDate, page, limit } = result.data

  const whereClause: any = {}
  if (status) whereClause.reviewStatus = status
  if (startDate) whereClause.submittedAt = { ...whereClause.submittedAt, gte: new Date(startDate) }
  if (endDate) whereClause.submittedAt = { ...whereClause.submittedAt, lte: new Date(endDate) }

  const items: any[] = []
  let total = 0

  if (!contentType || contentType === 'NOVEL') {
    const [novels, novelCount] = await Promise.all([
      prisma.novel.findMany({
        where: { ...whereClause, submittedAt: { not: null } },
        include: {
          author: { select: { id: true, username: true, avatar: true } }
        },
        orderBy: { submittedAt: 'desc' },
        skip: contentType ? (page - 1) * limit : 0,
        take: contentType ? limit : undefined
      }),
      prisma.novel.count({
        where: { ...whereClause, submittedAt: { not: null } }
      })
    ])
    items.push(...novels.map(n => ({ ...n, contentType: 'NOVEL' })))
    if (contentType) total = novelCount
  }

  if (!contentType || contentType === 'CHAPTER') {
    const [chapters, chapterCount] = await Promise.all([
      prisma.chapter.findMany({
        where: { ...whereClause, submittedAt: { not: null } },
        include: {
          novel: {
            select: { id: true, title: true },
            include: { author: { select: { id: true, username: true, avatar: true } } }
          }
        },
        orderBy: { submittedAt: 'desc' },
        skip: contentType ? (page - 1) * limit : 0,
        take: contentType ? limit : undefined
      }),
      prisma.chapter.count({
        where: { ...whereClause, submittedAt: { not: null } }
      })
    ])
    items.push(...chapters.map(c => ({ ...c, contentType: 'CHAPTER' })))
    if (contentType) total = chapterCount
  }

  if (!contentType || contentType === 'COMMENT') {
    const [comments, commentCount] = await Promise.all([
      prisma.comment.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          chapter: { select: { id: true, title: true, novelId: true } }
        },
        orderBy: { submittedAt: 'desc' },
        skip: contentType ? (page - 1) * limit : 0,
        take: contentType ? limit : undefined
      }),
      prisma.comment.count({
        where: whereClause
      })
    ])
    items.push(...comments.map(c => ({ ...c, contentType: 'COMMENT' })))
    if (contentType) total = commentCount
  }

  if (!contentType) {
    items.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    total = items.length
    const start = (page - 1) * limit
    const paginatedItems = items.slice(start, start + limit)
    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
