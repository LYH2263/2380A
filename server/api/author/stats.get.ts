import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const query = getQuery(event)
  const novelId = query.novelId ? Number(query.novelId) : null
  const days = Number(query.days) || 30

  const now = new Date()
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  const authorNovels = await prisma.novel.findMany({
    where: {
      authorId: user.userId,
      ...(novelId ? { id: novelId } : {})
    },
    select: {
      id: true,
      title: true,
      cover: true,
      status: true,
      createdAt: true,
      viewCount: true,
      _count: {
        select: { chapters: true, favorites: true }
      }
    },
    orderBy: { updatedAt: 'desc' }
  })

  const novelIds = authorNovels.map(n => n.id)

  const [dailyStats, chapterStats, commentsData] = await Promise.all([
    novelIds.length > 0
      ? prisma.novelDailyStat.findMany({
          where: {
            novelId: { in: novelIds },
            date: { gte: startDate }
          },
          orderBy: { date: 'asc' }
        })
      : [],
    novelIds.length > 0
      ? prisma.chapter.findMany({
          where: {
            novelId: { in: novelIds },
            status: 'PUBLISHED'
          },
          select: {
            id: true,
            novelId: true,
            title: true,
            order: true,
            viewCount: true,
            readCount: true,
            finishCount: true,
            wordCount: true,
            publishedAt: true
          },
          orderBy: { order: 'asc' }
        })
      : [],
    novelIds.length > 0
      ? prisma.comment.findMany({
          where: {
            chapter: { novelId: { in: novelIds } }
          },
          select: { id: true, createdAt: true, chapterId: true }
        })
      : []
  ])

  const dateMap = new Map<string, any>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dateStr = d.toISOString().split('T')[0]
    dateMap.set(dateStr, {
      date: dateStr,
      views: 0,
      favorites: 0,
      comments: 0
    })
  }

  for (const stat of dailyStats) {
    const dateStr = new Date(stat.date).toISOString().split('T')[0]
    const existing = dateMap.get(dateStr)
    if (existing) {
      existing.views += stat.viewCount || 0
      existing.favorites += stat.favoriteCount || 0
      existing.comments += stat.commentCount || 0
    }
  }

  const dailyTrend = Array.from(dateMap.values())

  const novelsWithStats = authorNovels.map(novel => {
    const chapters = chapterStats.filter(c => c.novelId === novel.id)
    const totalViews = chapters.reduce((s, c) => s + c.viewCount, 0) + novel.viewCount
    const totalReads = chapters.reduce((s, c) => s + c.readCount, 0)
    const totalFinishes = chapters.reduce((s, c) => s + c.finishCount, 0)
    const retentionRate = totalReads > 0 ? Math.round((totalFinishes / totalReads) * 100) : 0

    const novelDailyStats = dailyStats.filter(s => s.novelId === novel.id)
    const novelDailyMap = new Map<string, any>()
    for (const d of dailyTrend) {
      novelDailyMap.set(d.date, { date: d.date, views: 0, comments: 0 })
    }
    for (const s of novelDailyStats) {
      const dateStr = new Date(s.date).toISOString().split('T')[0]
      const e = novelDailyMap.get(dateStr)
      if (e) {
        e.views = s.viewCount || 0
        e.comments = s.commentCount || 0
      }
    }

    return {
      ...novel,
      totalChapterViews: totalViews,
      retentionRate,
      chapterCount: chapters.length,
      chapters,
      dailyTrend: Array.from(novelDailyMap.values())
    }
  })

  const summary = {
    totalViews: novelsWithStats.reduce((s, n) => s + n.viewCount, 0),
    totalFavorites: novelsWithStats.reduce((s, n) => s + n._count.favorites, 0),
    totalChapters: novelsWithStats.reduce((s, n) => s + n._count.chapters, 0),
    totalComments: commentsData.length,
    avgRetentionRate: novelsWithStats.length > 0
      ? Math.round(novelsWithStats.reduce((s, n) => s + n.retentionRate, 0) / novelsWithStats.length)
      : 0
  }

  return {
    summary,
    dailyTrend,
    novels: novelsWithStats
  }
})
