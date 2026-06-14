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

  const baseWhere: any = {}
  if (status) baseWhere.reviewStatus = status

  const submittedAtFilter: any = {}
  if (startDate) submittedAtFilter.gte = new Date(startDate)
  if (endDate) submittedAtFilter.lte = new Date(endDate + 'T23:59:59.999Z')

  const buildContentWhere = (needsNotNull: boolean) => {
    const where: any = { ...baseWhere }
    if (needsNotNull || Object.keys(submittedAtFilter).length > 0) {
      where.submittedAt = {
        ...(needsNotNull ? { not: null } : {}),
        ...submittedAtFilter
      }
    }
    return where
  }

  const isSpecificType = contentType === 'NOVEL' || contentType === 'CHAPTER' || contentType === 'COMMENT'

  try {
    const items: any[] = []
    let total = 0

    if (!contentType || contentType === 'NOVEL') {
      const novelWhere = buildContentWhere(true)
      const [novels, novelCount] = await Promise.all([
        prisma.novel.findMany({
          where: novelWhere,
          select: {
            id: true,
            title: true,
            description: true,
            cover: true,
            tags: true,
            reviewStatus: true,
            rejectionReason: true,
            submittedAt: true,
            createdAt: true,
            author: { select: { id: true, username: true, avatar: true } }
          },
          orderBy: { submittedAt: 'desc' },
          ...(isSpecificType ? { skip: (page - 1) * limit, take: limit } : { take: 100 })
        }),
        prisma.novel.count({ where: novelWhere })
      ])
      items.push(...novels.map(n => ({ ...n, contentType: 'NOVEL' as const })))
      if (contentType === 'NOVEL') total = novelCount
    }

    if (!contentType || contentType === 'CHAPTER') {
      const chapterWhere = buildContentWhere(true)
      const [chapters, chapterCount] = await Promise.all([
        prisma.chapter.findMany({
          where: chapterWhere,
          select: {
            id: true,
            title: true,
            content: true,
            order: true,
            wordCount: true,
            reviewStatus: true,
            rejectionReason: true,
            submittedAt: true,
            createdAt: true,
            novel: {
              select: {
                id: true,
                title: true,
                author: { select: { id: true, username: true, avatar: true } }
              }
            }
          },
          orderBy: { submittedAt: 'desc' },
          ...(isSpecificType ? { skip: (page - 1) * limit, take: limit } : { take: 100 })
        }),
        prisma.chapter.count({ where: chapterWhere })
      ])
      items.push(...chapters.map(c => ({ ...c, contentType: 'CHAPTER' as const })))
      if (contentType === 'CHAPTER') total = chapterCount
    }

    if (!contentType || contentType === 'COMMENT') {
      const commentWhere = buildContentWhere(false)
      if (!commentWhere.submittedAt) {
        commentWhere.submittedAt = { not: null }
      }
      const [comments, commentCount] = await Promise.all([
        prisma.comment.findMany({
          where: commentWhere,
          select: {
            id: true,
            content: true,
            paragraph: true,
            reviewStatus: true,
            rejectionReason: true,
            submittedAt: true,
            createdAt: true,
            user: { select: { id: true, username: true, avatar: true } },
            chapter: { select: { id: true, title: true, novelId: true } }
          },
          orderBy: { submittedAt: 'desc' },
          ...(isSpecificType ? { skip: (page - 1) * limit, take: limit } : { take: 100 })
        }),
        prisma.comment.count({ where: commentWhere })
      ])
      items.push(...comments.map(c => ({ ...c, contentType: 'COMMENT' as const })))
      if (contentType === 'COMMENT') total = commentCount
    }

    if (!isSpecificType) {
      items.sort((a, b) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0
        return dateB - dateA
      })
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
  } catch (error: any) {
    console.error('[Review Queue API Error]', error)
    throw createError({
      statusCode: 500,
      message: error.message || '加载审核队列失败'
    })
  }
})
