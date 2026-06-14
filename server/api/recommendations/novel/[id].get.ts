import prisma from '~/server/utils/prisma'
import { getAuthUser } from '~/server/utils/auth'
import {
  getCachedNovelRecommendations,
  fetchNovelsWithDetails
} from '~/server/utils/recommendation'

export default defineEventHandler(async (event) => {
  const user = getAuthUser(event)
  const novelId = Number(getRouterParam(event, 'id'))

  if (!novelId || isNaN(novelId)) {
    throw createError({ statusCode: 400, message: '无效的小说ID' })
  }

  try {
    const { similarUsers, similarTags } = await getCachedNovelRecommendations(novelId)

    const excludedIds = new Set<number>()
    if (user) {
      const feedbacks = await prisma.recommendationFeedback.findMany({
        where: { userId: user.userId },
        select: { novelId: true }
      })
      feedbacks.forEach(f => excludedIds.add(f.novelId))
    }

    const filteredSimilarUsers = similarUsers.filter(r => !excludedIds.has(r.novelId))
    const filteredSimilarTags = similarTags.filter(r => !excludedIds.has(r.novelId))

    const [similarUsersNovels, similarTagsNovels] = await Promise.all([
      fetchNovelsWithDetails(filteredSimilarUsers, user?.userId),
      fetchNovelsWithDetails(filteredSimilarTags, user?.userId)
    ])

    return {
      similarUsers: similarUsersNovels,
      similarTags: similarTagsNovels
    }
  } catch (error) {
    console.error(`[Recommendation API] Error for novel ${novelId}:`, error)
    const { getFallbackRecommendations, fetchNovelsWithDetails: fetchDetails } = await import('~/server/utils/recommendation')
    const fallback = await getFallbackRecommendations(novelId, 6, '热门作品推荐')
    const fallbackNovels = await fetchDetails(fallback, user?.userId)
    return {
      similarUsers: fallbackNovels,
      similarTags: fallbackNovels
    }
  }
})
