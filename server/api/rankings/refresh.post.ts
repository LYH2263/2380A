import prisma from '~/server/utils/prisma'
import { getAuthUser } from '~/server/utils/auth'
import { computeRanking, getPeriodKey, getRankingCacheKey, updatePeriodStats, RANKING_TYPES, RANKING_PERIODS } from '~/server/utils/ranking'

export default defineEventHandler(async (event) => {
  const user = getAuthUser(event)

  if (!user || user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: '无权限执行此操作'
    })
  }

  const body = await readBody(event)
  const type = body?.type?.toUpperCase()
  const period = body?.period?.toUpperCase()

  const now = new Date()
  const rankingTypes = type ? [type] : Object.values(RANKING_TYPES)
  const periods = period ? [period] : Object.values(RANKING_PERIODS)

  for (const rPeriod of periods) {
    if (rPeriod === 'WEEK' || rPeriod === 'MONTH') {
      const periodKey = getPeriodKey(rPeriod as any, now)
      try {
        await updatePeriodStats(rPeriod as any, periodKey)
      } catch (error) {
        console.error(`Error updating period stats for ${rPeriod} ${periodKey}:`, error)
      }
    }
  }

  const results: Record<string, any> = {}

  for (const rType of rankingTypes) {
    if (!Object.values(RANKING_TYPES).includes(rType as any)) continue

    for (const rPeriod of periods) {
      if (!Object.values(RANKING_PERIODS).includes(rPeriod as any)) continue

      const basePeriodKey = getPeriodKey(rPeriod as any, now)
      const cacheKey = getRankingCacheKey(rPeriod as any, basePeriodKey)
      const rankings = await computeRanking(rType as any, rPeriod as any, basePeriodKey, 100)

      await prisma.rankingCache.upsert({
        where: {
          rankingType_period_periodKey: {
            rankingType: rType as any,
            period: rPeriod as any,
            periodKey: cacheKey
          }
        },
        update: { data: JSON.stringify(rankings) },
        create: {
          rankingType: rType as any,
          period: rPeriod as any,
          periodKey: cacheKey,
          data: JSON.stringify(rankings)
        }
      })

      if (!results[rType]) results[rType] = {}
      results[rType][rPeriod] = { count: rankings.length, periodKey: basePeriodKey, cacheKey }
    }
  }

  return {
    success: true,
    message: '排行榜缓存刷新成功',
    results
  }
})
