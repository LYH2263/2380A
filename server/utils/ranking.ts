import prisma from '~/server/utils/prisma'

export const RANKING_TYPES = {
  POPULARITY: 'POPULARITY',
  RATING: 'RATING',
  FAVORITE: 'FAVORITE',
  NEW_BOOK: 'NEW_BOOK',
  COMPLETED: 'COMPLETED'
} as const

export const RANKING_PERIODS = {
  WEEK: 'WEEK',
  MONTH: 'MONTH',
  ALL: 'ALL'
} as const

export type RankingType = typeof RANKING_TYPES[keyof typeof RANKING_TYPES]
export type RankingPeriod = typeof RANKING_PERIODS[keyof typeof RANKING_PERIODS]

export const RANKING_TYPE_LABELS: Record<RankingType, string> = {
  POPULARITY: '人气榜',
  RATING: '好评榜',
  FAVORITE: '收藏榜',
  NEW_BOOK: '新书榜',
  COMPLETED: '完结榜'
}

export const RANKING_PERIOD_LABELS: Record<RankingPeriod, string> = {
  WEEK: '周榜',
  MONTH: '月榜',
  ALL: '总榜'
}

export function getWeekKey(date: Date): string {
  const year = date.getFullYear()
  const d = new Date(Date.UTC(year, 0, 1))
  const dayNum = Math.floor((date.getTime() - d.getTime()) / 86400000)
  const weekNum = Math.ceil((dayNum + d.getUTCDay() + 1) / 7)
  return `${year}-W${weekNum.toString().padStart(2, '0')}`
}

export function getMonthKey(date: Date): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  return `${year}-${month}`
}

export function getPeriodKey(period: RankingPeriod, date: Date): string {
  switch (period) {
    case 'WEEK':
      return getWeekKey(date)
    case 'MONTH':
      return getMonthKey(date)
    case 'ALL':
      return 'all'
    default:
      return 'all'
  }
}

export function getPreviousPeriodKey(period: RankingPeriod, periodKey: string): string | null {
  if (period === 'ALL') return null

  const date = new Date()
  if (period === 'WEEK') {
    const [yearStr, weekStr] = periodKey.split('-W')
    const year = parseInt(yearStr)
    const week = parseInt(weekStr)
    
    const prevWeek = week - 1
    if (prevWeek > 0) {
      return `${year}-W${prevWeek.toString().padStart(2, '0')}`
    } else {
      const prevYear = year - 1
      const lastWeekOfPrevYear = getWeeksInYear(prevYear)
      return `${prevYear}-W${lastWeekOfPrevYear.toString().padStart(2, '0')}`
    }
  }
  
  if (period === 'MONTH') {
    const [yearStr, monthStr] = periodKey.split('-')
    const year = parseInt(yearStr)
    const month = parseInt(monthStr)
    
    const prevMonth = month - 1
    if (prevMonth > 0) {
      return `${year}-${prevMonth.toString().padStart(2, '0')}`
    } else {
      return `${year - 1}-12`
    }
  }
  
  return null
}

function getWeeksInYear(year: number): number {
  const d = new Date(Date.UTC(year, 11, 31))
  const dayNum = Math.floor((d.getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) / 86400000)
  return Math.ceil((dayNum + new Date(Date.UTC(year, 0, 1)).getUTCDay() + 1) / 7)
}

export function getPeriodDateRange(period: RankingPeriod, periodKey: string): { start: Date; end: Date } {
  if (period === 'ALL') {
    return {
      start: new Date(0),
      end: new Date()
    }
  }

  if (period === 'WEEK') {
    const [yearStr, weekStr] = periodKey.split('-W')
    const year = parseInt(yearStr)
    const week = parseInt(weekStr)
    
    const d = new Date(Date.UTC(year, 0, 1))
    const dayNum = (week - 1) * 7 - d.getUTCDay()
    const start = new Date(Date.UTC(year, 0, 1 + dayNum))
    const end = new Date(start.getTime() + 7 * 86400000 - 1)
    
    return { start, end }
  }

  if (period === 'MONTH') {
    const [yearStr, monthStr] = periodKey.split('-')
    const year = parseInt(yearStr)
    const month = parseInt(monthStr) - 1
    
    const start = new Date(Date.UTC(year, month, 1))
    const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59))
    
    return { start, end }
  }

  return { start: new Date(0), end: new Date() }
}

export async function computeRanking(
  rankingType: RankingType,
  period: RankingPeriod,
  periodKey: string,
  limit: number = 100
): Promise<any[]> {
  const { start, end } = getPeriodDateRange(period, periodKey)

  let novels: any[] = []

  switch (rankingType) {
    case 'POPULARITY':
      novels = await computePopularityRanking(period, start, end, limit)
      break
    case 'RATING':
      novels = await computeRatingRanking(period, start, end, limit)
      break
    case 'FAVORITE':
      novels = await computeFavoriteRanking(period, start, end, limit)
      break
    case 'NEW_BOOK':
      novels = await computeNewBookRanking(limit)
      break
    case 'COMPLETED':
      novels = await computeCompletedRanking(period, start, end, limit)
      break
  }

  return novels
}

async function computePopularityRanking(
  period: RankingPeriod,
  start: Date,
  end: Date,
  limit: number
): Promise<any[]> {
  if (period === 'ALL') {
    return prisma.novel.findMany({
      orderBy: { viewCount: 'desc' },
      take: limit,
      include: {
        author: { select: { id: true, username: true, avatar: true } },
        _count: { select: { chapters: true, favorites: true } }
      }
    })
  }

  return prisma.novel.findMany({
    where: {
      readHistory: {
        some: {
          updatedAt: { gte: start, lte: end }
        }
      }
    },
    orderBy: { viewCount: 'desc' },
    take: limit,
    include: {
      author: { select: { id: true, username: true, avatar: true } },
      _count: { select: { chapters: true, favorites: true } }
    }
  })
}

async function computeRatingRanking(
  period: RankingPeriod,
  start: Date,
  end: Date,
  limit: number
): Promise<any[]> {
  const minRatingCount = 10

  if (period === 'ALL') {
    const novels = await prisma.novel.findMany({
      where: {
        ratings: { _count: { gte: minRatingCount } }
      },
      include: {
        author: { select: { id: true, username: true, avatar: true } },
        _count: { select: { chapters: true, favorites: true, ratings: true } },
        ratings: { select: { score: true } }
      },
      take: limit * 2
    })

    return novels
      .map(novel => {
        const avgRating = novel.ratings.reduce((sum: number, r: any) => sum + r.score, 0) / novel.ratings.length
        return { ...novel, avgRating, ratingCount: novel.ratings.length }
      })
      .filter(n => n.ratingCount >= minRatingCount)
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, limit)
  }

  const novels = await prisma.novel.findMany({
    where: {
      ratings: {
        some: { createdAt: { gte: start, lte: end } },
        _count: { gte: minRatingCount }
      }
    },
    include: {
      author: { select: { id: true, username: true, avatar: true } },
      _count: { select: { chapters: true, favorites: true } },
      ratings: {
        where: { createdAt: { gte: start, lte: end } },
        select: { score: true }
      }
    },
    take: limit * 2
  })

  return novels
    .map(novel => {
      const ratingCount = novel.ratings.length
      const avgRating = ratingCount > 0
        ? novel.ratings.reduce((sum: number, r: any) => sum + r.score, 0) / ratingCount
        : 0
      return { ...novel, avgRating, ratingCount }
    })
    .filter(n => n.ratingCount >= minRatingCount)
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, limit)
}

async function computeFavoriteRanking(
  period: RankingPeriod,
  start: Date,
  end: Date,
  limit: number
): Promise<any[]> {
  if (period === 'ALL') {
    return prisma.novel.findMany({
      orderBy: { favorites: { _count: 'desc' } },
      take: limit,
      include: {
        author: { select: { id: true, username: true, avatar: true } },
        _count: { select: { chapters: true, favorites: true, ratings: true } }
      }
    })
  }

  const novels = await prisma.novel.findMany({
    where: {
      favorites: { some: { createdAt: { gte: start, lte: end } } }
    },
    include: {
      author: { select: { id: true, username: true, avatar: true } },
      _count: { select: { chapters: true, ratings: true } },
      favorites: {
        where: { createdAt: { gte: start, lte: end } }
      }
    },
    take: limit * 2
  })

  return novels
    .map(novel => ({ ...novel, favoriteCount: novel.favorites.length }))
    .sort((a, b) => b.favoriteCount - a.favoriteCount)
    .slice(0, limit)
}

async function computeNewBookRanking(limit: number): Promise<any[]> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  return prisma.novel.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo }
    },
    orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    include: {
      author: { select: { id: true, username: true, avatar: true } },
      _count: { select: { chapters: true, favorites: true, ratings: true } }
    }
  })
}

async function computeCompletedRanking(
  period: RankingPeriod,
  start: Date,
  end: Date,
  limit: number
): Promise<any[]> {
  if (period === 'ALL') {
    return prisma.novel.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { viewCount: 'desc' },
      take: limit,
      include: {
        author: { select: { id: true, username: true, avatar: true } },
        _count: { select: { chapters: true, favorites: true, ratings: true } }
      }
    })
  }

  return prisma.novel.findMany({
    where: {
      status: 'COMPLETED',
      updatedAt: { gte: start, lte: end }
    },
    orderBy: { viewCount: 'desc' },
    take: limit,
    include: {
      author: { select: { id: true, username: true, avatar: true } },
      _count: { select: { chapters: true, favorites: true, ratings: true } }
    }
  })
}

export async function getRankingWithTrend(
  rankingType: RankingType,
  period: RankingPeriod,
  page: number = 1,
  limit: number = 20
): Promise<{ items: any[]; total: number; page: number; limit: number; periodKey: string }> {
  const now = new Date()
  const currentPeriodKey = getPeriodKey(period, now)
  const prevPeriodKey = getPreviousPeriodKey(period, currentPeriodKey)

  let currentRankings: any[] = []
  const cached = await prisma.rankingCache.findUnique({
    where: {
      rankingType_period_periodKey: {
        rankingType,
        period,
        periodKey: currentPeriodKey
      }
    }
  })

  if (cached) {
    currentRankings = JSON.parse(cached.data)
  } else {
    currentRankings = await computeRanking(rankingType, period, currentPeriodKey, 100)
    await prisma.rankingCache.upsert({
      where: {
        rankingType_period_periodKey: {
          rankingType,
          period,
          periodKey: currentPeriodKey
        }
      },
      update: { data: JSON.stringify(currentRankings) },
      create: {
        rankingType,
        period,
        periodKey: currentPeriodKey,
        data: JSON.stringify(currentRankings)
      }
    })
  }

  let prevRankMap: Record<number, number> = {}
  if (prevPeriodKey) {
    const prevCached = await prisma.rankingCache.findUnique({
      where: {
        rankingType_period_periodKey: {
          rankingType,
          period,
          periodKey: prevPeriodKey
        }
      }
    })

    if (prevCached) {
      const prevRankings = JSON.parse(prevCached.data)
      prevRankMap = prevRankings.reduce((map: Record<number, number>, item: any, index: number) => {
        map[item.id] = index + 1
        return map
      }, {})
    }
  }

  const total = currentRankings.length
  const startIndex = (page - 1) * limit
  const paginatedItems = currentRankings.slice(startIndex, startIndex + limit)

  const itemsWithTrend = paginatedItems.map((item, index) => {
    const currentRank = startIndex + index + 1
    const prevRank = prevRankMap[item.id]
    let trend: 'up' | 'down' | 'same' | 'new' = 'new'
    let trendValue: number = 0

    if (prevRank !== undefined) {
      if (currentRank < prevRank) {
        trend = 'up'
        trendValue = prevRank - currentRank
      } else if (currentRank > prevRank) {
        trend = 'down'
        trendValue = currentRank - prevRank
      } else {
        trend = 'same'
        trendValue = 0
      }
    }

    return {
      ...item,
      rank: currentRank,
      trend,
      trendValue
    }
  })

  return {
    items: itemsWithTrend,
    total,
    page,
    limit,
    periodKey: currentPeriodKey
  }
}

export async function getHomeRankings(): Promise<Record<string, any[]>> {
  const rankingTypes: RankingType[] = ['POPULARITY', 'RATING', 'FAVORITE', 'NEW_BOOK', 'COMPLETED']
  const result: Record<string, any[]> = {}

  for (const type of rankingTypes) {
    const { items } = await getRankingWithTrend(type, 'ALL', 1, 10)
    result[type] = items
  }

  return result
}
