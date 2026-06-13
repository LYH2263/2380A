import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [novels, totalStats] = await Promise.all([
    prisma.novel.findMany({
      where: { authorId: user.userId },
      include: {
        _count: {
          select: {
            chapters: {
              where: { status: 'PUBLISHED' }
            },
            favorites: true
          }
        },
        chapters: {
          where: { status: 'PUBLISHED' },
          include: {
            _count: {
              select: { comments: true }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    }),
    prisma.$transaction(async (tx) => {
      const authorNovels = await tx.novel.findMany({
        where: { authorId: user.userId },
        select: { id: true }
      })
      const novelIds = authorNovels.map(n => n.id)

      const [totalViews, totalFavorites, totalComments, weeklyStats] = await Promise.all([
        novelIds.length > 0
          ? tx.novel.aggregate({
              where: { id: { in: novelIds } },
              _sum: { viewCount: true }
            }).then(r => r._sum.viewCount || 0)
          : 0,
        novelIds.length > 0
          ? tx.favorite.count({
              where: { novelId: { in: novelIds } }
            })
          : 0,
        novelIds.length > 0
          ? tx.comment.count({
              where: { chapter: { novelId: { in: novelIds } } }
            })
          : 0,
        novelIds.length > 0
          ? tx.novelDailyStat.findMany({
              where: {
                novelId: { in: novelIds },
                date: { gte: weekAgo }
              },
              orderBy: { date: 'asc' }
            })
          : []
      ])

      return {
        totalViews,
        totalFavorites,
        totalComments,
        weeklyStats
      }
    })
  ])

  const dailyMap = new Map<string, { views: number; favorites: number; comments: number }>()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dateStr = d.toISOString().split('T')[0]
    dailyMap.set(dateStr, { views: 0, favorites: 0, comments: 0 })
  }

  for (const stat of totalStats.weeklyStats) {
    const dateStr = new Date(stat.date).toISOString().split('T')[0]
    const existing = dailyMap.get(dateStr) || { views: 0, favorites: 0, comments: 0 }
    dailyMap.set(dateStr, {
      views: existing.views + (stat.viewCount || 0),
      favorites: existing.favorites + (stat.favoriteCount || 0),
      comments: existing.comments + (stat.commentCount || 0)
    })
  }

  const weeklyTrend = Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    label: new Date(date).toLocaleDateString('zh-CN', { weekday: 'short' }),
    ...data
  }))

  const totalChapters = novels.reduce((sum, n) => sum + (n._count.chapters || 0), 0)
  const totalComments = novels.reduce(
    (sum, n) => sum + n.chapters.reduce((s, c) => s + (c._count.comments || 0), 0),
    0
  )

  return {
    novels,
    summary: {
      totalNovels: novels.length,
      totalChapters,
      totalViews: totalStats.totalViews,
      totalFavorites: totalStats.totalFavorites,
      totalComments: Math.max(totalComments, totalStats.totalComments)
    },
    weeklyTrend
  }
})
