import { refreshAllRecommendationCaches } from '~/server/utils/recommendation'

const REFRESH_INTERVAL = 6 * 60 * 60 * 1000

const recommendationScheduler = {
  timer: null as NodeJS.Timeout | null,

  start() {
    console.log('[Recommendation Scheduler] Starting...')

    setTimeout(() => {
      this.refreshAll()
    }, 60 * 1000)

    this.timer = setInterval(() => {
      this.refreshAll()
    }, REFRESH_INTERVAL)

    console.log('[Recommendation Scheduler] Started.')
  },

  stop() {
    console.log('[Recommendation Scheduler] Stopping...')
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    console.log('[Recommendation Scheduler] Stopped.')
  },

  async refreshAll() {
    console.log('[Recommendation Scheduler] Starting full refresh...')
    const startTime = Date.now()
    try {
      await refreshAllRecommendationCaches(50)
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(`[Recommendation Scheduler] Refresh completed in ${elapsed}s`)
    } catch (error) {
      console.error('[Recommendation Scheduler] Refresh failed:', error)
    }
  }
}

export default defineNitroPlugin(() => {
  if (process.env.DISABLE_RECOMMENDATION_SCHEDULER !== 'true') {
    recommendationScheduler.start()
  }
})

export { recommendationScheduler }
