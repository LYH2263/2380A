import prisma from '~/server/utils/prisma'
import { getAuthUser, requireAuth } from '~/server/utils/auth'
import {
  getCachedPersonalizedRecommendations,
  fetchNovelsWithDetails
} from '~/server/utils/recommendation'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)
  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 8, 20)

  const [dbUser, tagPreferences, readHistoryCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { onboardingCompleted: true }
    }),
    prisma.userTagPreference.findMany({
      where: { userId: authUser.userId },
      select: { tag: true, weight: true }
    }),
    prisma.readHistory.count({ where: { userId: authUser.userId } })
  ])

  const recs = await getCachedPersonalizedRecommendations(authUser.userId, limit)
  const novels = await fetchNovelsWithDetails(recs, authUser.userId)

  const needsOnboarding =
    !dbUser?.onboardingCompleted &&
    tagPreferences.length === 0 &&
    readHistoryCount === 0

  return {
    novels,
    needsOnboarding,
    tagPreferences: tagPreferences.map(tp => tp.tag)
  }
})
