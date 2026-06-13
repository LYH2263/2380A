import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const query = getQuery(event)
  const contentType = query.contentType as string || ''
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20

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
        skip: contentType ? (page - 1) * limit : 0,
        take: contentType ? limit : undefined
      }),
      prisma.novel.count({
        where: { authorId: user.userId, submittedAt: { not: null } }
      })
    ])
    items.push(...novels.map(n => ({ ...n, contentType: 'NOVEL' })))
    if (contentType) total = novelCount
  }

  if (!contentType || contentType === 'CHAPTER') {
    const [chapters, chapterCount] = await Promise.all([
      prisma.chapter.findMany({
        where: {
          novel: { authorId: user.userId },
          submittedAt: { not: null }
        },
        include: {
          novel: { select: { id: true, title: true } }
        },
        orderBy: { submittedAt: 'desc' },
        skip: contentType ? (page - 1) * limit : 0,
        take: contentType ? limit : undefined
      }),
      prisma.chapter.count({
        where: { novel: { authorId: user.userId }, submittedAt: { not: null } }
      })
    ])
    items.push(...chapters.map(c => ({ ...c, contentType: 'CHAPTER' })))
    if (contentType) total = chapterCount
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
