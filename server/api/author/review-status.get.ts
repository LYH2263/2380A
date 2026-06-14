import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const query = getQuery(event)
  const contentType = query.contentType as string || ''
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))

  const isSpecificType = contentType === 'NOVEL' || contentType === 'CHAPTER'

  try {
    const items: any[] = []
    let total = 0

    if (!contentType || contentType === 'NOVEL') {
      const [novels, novelCount] = await Promise.all([
        prisma.novel.findMany({
          where: {
            authorId: user.userId,
            submittedAt: { not: null }
          },
          select: {
            id: true,
            title: true,
            cover: true,
            reviewStatus: true,
            rejectionReason: true,
            submittedAt: true,
            updatedAt: true,
            _count: { select: { chapters: true } }
          },
          orderBy: { submittedAt: 'desc' },
          ...(isSpecificType ? { skip: (page - 1) * limit, take: limit } : { take: 100 })
        }),
        prisma.novel.count({
          where: { authorId: user.userId, submittedAt: { not: null } }
        })
      ])
      items.push(...novels.map(n => ({ ...n, contentType: 'NOVEL' as const })))
      if (contentType === 'NOVEL') total = novelCount
    }

    if (!contentType || contentType === 'CHAPTER') {
      const [chapters, chapterCount] = await Promise.all([
        prisma.chapter.findMany({
          where: {
            novel: { authorId: user.userId },
            submittedAt: { not: null }
          },
          select: {
            id: true,
            title: true,
            reviewStatus: true,
            rejectionReason: true,
            submittedAt: true,
            updatedAt: true,
            novel: { select: { id: true, title: true } }
          },
          orderBy: { submittedAt: 'desc' },
          ...(isSpecificType ? { skip: (page - 1) * limit, take: limit } : { take: 100 })
        }),
        prisma.chapter.count({
          where: { novel: { authorId: user.userId }, submittedAt: { not: null } }
        })
      ])
      items.push(...chapters.map(c => ({ ...c, contentType: 'CHAPTER' as const })))
      if (contentType === 'CHAPTER') total = chapterCount
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
    console.error('[Author Review Status API Error]', error)
    throw createError({
      statusCode: 500,
      message: error.message || '加载审核状态失败'
    })
  }
})
