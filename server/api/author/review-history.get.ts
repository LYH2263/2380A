import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const query = getQuery(event)
  const contentType = query.contentType as string || ''
  const contentId = query.contentId ? Number(query.contentId) : null
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))

  try {
    const whereClause: any = {}
    if (contentType) whereClause.contentType = contentType

    if (contentId) {
      if (contentType === 'NOVEL') {
        const novel = await prisma.novel.findUnique({ where: { id: contentId } })
        if (!novel || novel.authorId !== user.userId) {
          throw createError({ statusCode: 403, message: '无权查看' })
        }
        whereClause.novelId = contentId
      } else if (contentType === 'CHAPTER') {
        const chapter = await prisma.chapter.findUnique({ where: { id: contentId }, include: { novel: true } })
        if (!chapter || chapter.novel.authorId !== user.userId) {
          throw createError({ statusCode: 403, message: '无权查看' })
        }
        whereClause.chapterId = contentId
      }
    } else {
      const userNovelIds = (await prisma.novel.findMany({ where: { authorId: user.userId }, select: { id: true } })).map(n => n.id)
      const userChapterIds = (await prisma.chapter.findMany({ where: { novelId: { in: userNovelIds } }, select: { id: true } })).map(c => c.id)
      whereClause.OR = [
        { novelId: { in: userNovelIds } },
        { chapterId: { in: userChapterIds } }
      ]
    }

    const [records, total] = await Promise.all([
      prisma.reviewRecord.findMany({
        where: whereClause,
        include: {
          reviewer: { select: { id: true, username: true, avatar: true } },
          novel: { select: { id: true, title: true } },
          chapter: { select: { id: true, title: true } }
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
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('[Author Review History API Error]', error)
    throw createError({
      statusCode: 500,
      message: error.message || '加载审核历史失败'
    })
  }
})
