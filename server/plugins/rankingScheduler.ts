import prisma from '~/server/utils/prisma'
import { computeRanking, getPeriodKey, RANKING_TYPES, RANKING_PERIODS } from '~/server/utils/ranking'

const CACHE_TTL = 30 * 60 * 1000

const rankingScheduler = {
  timers: [] as NodeJS.Timeout[],

  start() {
    console.log('[Ranking Scheduler] Starting ranking scheduler...')

    this.refreshAllRankings()

    const refreshTimer = setInterval(() => {
      this.refreshAllRankings()
    }, CACHE_TTL)
    this.timers.push(refreshTimer)

    console.log('[Ranking Scheduler] Scheduler started.')
  },

  stop() {
    console.log('[Ranking Scheduler] Stopping ranking scheduler...')
    this.timers.forEach(timer => clearInterval(timer))
    this.timers = []
    console.log('[Ranking Scheduler] Scheduler stopped.')
  },

  async refreshAllRankings() {
    console.log('[Ranking Scheduler] Refreshing all rankings...')

    const now = new Date()
    const rankingTypes = Object.values(RANKING_TYPES)
    const periods = Object.values(RANKING_PERIODS)

    for (const rType of rankingTypes) {
      for (const rPeriod of periods) {
        try {
          const periodKey = getPeriodKey(rPeriod as any, now)
          const rankings = await computeRanking(rType as any, rPeriod as any, periodKey, 100)

          await prisma.rankingCache.upsert({
            where: {
              rankingType_period_periodKey: {
                rankingType: rType as any,
                period: rPeriod as any,
                periodKey
              }
            },
            update: { data: JSON.stringify(rankings) },
            create: {
              rankingType: rType as any,
              period: rPeriod as any,
              periodKey,
              data: JSON.stringify(rankings)
            }
          })

          console.log(`[Ranking Scheduler] Refreshed ${rType} ${rPeriod} (${rankings.length} items)`)
        } catch (error) {
          console.error(`[Ranking Scheduler] Error refreshing ${rType} ${rPeriod}:`, error)
        }
      }
    }

    console.log('[Ranking Scheduler] All rankings refreshed.')
  }
}

export default defineNitroPlugin(() => {
  if (process.env.DISABLE_RANKING_SCHEDULER !== 'true') {
    rankingScheduler.start()
  }
})

export { rankingScheduler }
