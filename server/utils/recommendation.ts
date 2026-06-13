import prisma from './prisma'

export interface RecommendationItem {
  novelId: number
  score: number
  reasons: string[]
}

export interface UserPreference {
  tagWeights: Record<string, number>
  authorWeights: Record<number, number>
}

function normalizeWeights(weights: Record<string | number, number>): Record<string | number, number> {
  const values = Object.values(weights)
  const max = Math.max(...values, 1)
  const result: Record<string | number, number> = {}
  for (const [key, value] of Object.entries(weights)) {
    result[key] = value / max
  }
  return result
}

export async function analyzeUserPreference(userId: number): Promise<UserPreference> {
  const [readHistory, favorites, tagPreferences] = await Promise.all([
    prisma.readHistory.findMany({
      where: { userId },
      include: { novel: { select: { tags: true, authorId: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 50
    }),
    prisma.favorite.findMany({
      where: { userId },
      include: { novel: { select: { tags: true, authorId: true } } },
      take: 50
    }),
    prisma.userTagPreference.findMany({
      where: { userId },
      select: { tag: true, weight: true }
    })
  ])

  const tagCounts: Record<string, number> = {}
  const authorCounts: Record<number, number> = {}

  const processNovel = (
    tags: string[],
    authorId: number,
    baseWeight: number,
    timeDecay: number = 1
  ) => {
    const weight = baseWeight * timeDecay
    for (const tag of tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + weight
    }
    authorCounts[authorId] = (authorCounts[authorId] || 0) + weight
  }

  const now = Date.now()
  readHistory.forEach((rh, index) => {
    const daysSince = (now - new Date(rh.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    const timeDecay = Math.max(0.3, 1 - daysSince / 90)
    const progressWeight = 0.5 + (rh.progress / 100) * 0.5
    const recencyBias = 1 - index * 0.01
    processNovel(rh.novel.tags, rh.novel.authorId, 1.2 * progressWeight * recencyBias, timeDecay)
  })

  favorites.forEach((fav, index) => {
    const daysSince = (now - new Date(fav.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    const timeDecay = Math.max(0.4, 1 - daysSince / 180)
    const statusWeight = fav.readingStatus === 'FINISHED' ? 1.5 : fav.readingStatus === 'READING' ? 1.2 : 1.0
    processNovel(fav.novel.tags, fav.novel.authorId, statusWeight, timeDecay)
  })

  for (const tp of tagPreferences) {
    tagCounts[tp.tag] = (tagCounts[tp.tag] || 0) + tp.weight * 2.0
  }

  return {
    tagWeights: normalizeWeights(tagCounts) as Record<string, number>,
    authorWeights: normalizeWeights(authorCounts) as Record<number, number>
  }
}

export function computeTagSimilarity(tagsA: string[], tagsB: string[]): number {
  if (tagsA.length === 0 || tagsB.length === 0) return 0
  const setA = new Set(tagsA)
  const setB = new Set(tagsB)
  let intersection = 0
  for (const tag of setA) {
    if (setB.has(tag)) intersection++
  }
  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

export async function getPersonalizedRecommendations(
  userId: number,
  limit: number = 8
): Promise<RecommendationItem[]> {
  const preference = await analyzeUserPreference(userId)
  const [readNovels, feedbacks] = await Promise.all([
    prisma.readHistory.findMany({
      where: { userId },
      select: { novelId: true }
    }),
    prisma.recommendationFeedback.findMany({
      where: { userId },
      select: { novelId: true }
    })
  ])

  const excludedNovelIds = new Set([
    ...readNovels.map(r => r.novelId),
    ...feedbacks.map(f => f.novelId)
  ])

  const hasPreference =
    Object.keys(preference.tagWeights).length > 0 ||
    Object.keys(preference.authorWeights).length > 0

  if (!hasPreference) {
    return getColdStartRecommendations(userId, limit)
  }

  const topTags = Object.entries(preference.tagWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag)

  const topAuthorIds = Object.entries(preference.authorWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => Number(id))

  const candidateNovels = await prisma.novel.findMany({
    where: {
      id: { notIn: [...excludedNovelIds] },
      OR: [
        { tags: { hasSome: topTags.length > 0 ? topTags : undefined } },
        { authorId: { in: topAuthorIds.length > 0 ? topAuthorIds : undefined } }
      ]
    },
    include: {
      author: { select: { id: true, username: true } },
      _count: { select: { favorites: true, ratings: true } },
      ratings: { select: { score: true } }
    },
    take: 200
  })

  const scoredNovels: RecommendationItem[] = candidateNovels.map(novel => {
    let score = 0
    const reasons: string[] = []

    for (const tag of novel.tags) {
      const weight = preference.tagWeights[tag] || 0
      if (weight > 0.3) {
        score += weight * 2.5
        if (weight > 0.6) {
          reasons.push(`因为你喜欢#${tag}#标签`)
        }
      }
    }

    const authorWeight = preference.authorWeights[novel.authorId] || 0
    if (authorWeight > 0) {
      score += authorWeight * 3
      if (authorWeight > 0.5) {
        reasons.push(`与你喜欢的作品同一作者`)
      }
    }

    const favoriteCount = novel._count.favorites || 0
    const popularityScore = Math.min(1, favoriteCount / 500) * 0.5
    score += popularityScore

    const avgRating = novel.ratings.length > 0
      ? novel.ratings.reduce((s, r) => s + r.score, 0) / novel.ratings.length
      : 0
    const ratingScore = (avgRating / 5) * 0.5
    score += ratingScore * (novel._count.ratings >= 5 ? 1 : 0.3)

    if (reasons.length === 0) {
      if (topTags.slice(0, 3).some(t => novel.tags.includes(t))) {
        reasons.push('相似风格作品推荐')
      } else {
        reasons.push('热门作品推荐')
      }
    }

    return {
      novelId: novel.id,
      score,
      reasons: Array.from(new Set(reasons)).slice(0, 2)
    }
  })

  return scoredNovels
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export async function getColdStartRecommendations(
  userId: number,
  limit: number = 8
): Promise<RecommendationItem[]> {
  const tagPreferences = await prisma.userTagPreference.findMany({
    where: { userId },
    select: { tag: true, weight: true }
  })

  const selectedTags = tagPreferences.map(tp => tp.tag)

  let novels
  if (selectedTags.length > 0) {
    novels = await prisma.novel.findMany({
      where: { tags: { hasSome: selectedTags } },
      include: {
        author: { select: { id: true, username: true } },
        _count: { select: { favorites: true, ratings: true } },
        ratings: { select: { score: true } }
      },
      orderBy: [
        { favorites: { _count: 'desc' } },
        { viewCount: 'desc' }
      ],
      take: 100
    })
  } else {
    novels = await prisma.novel.findMany({
      include: {
        author: { select: { id: true, username: true } },
        _count: { select: { favorites: true, ratings: true } },
        ratings: { select: { score: true } }
      },
      orderBy: [
        { favorites: { _count: 'desc' } },
        { viewCount: 'desc' }
      ],
      take: 100
    })
  }

  const tagWeightMap: Record<string, number> = {}
  for (const tp of tagPreferences) {
    tagWeightMap[tp.tag] = tp.weight
  }

  return novels.map(novel => {
    let score = 0
    const reasons: string[] = []

    for (const tag of novel.tags) {
      if (tagWeightMap[tag]) {
        score += tagWeightMap[tag] * 2
        reasons.push(`因为你选择了#${tag}#标签`)
      }
    }

    const popularityScore = Math.min(1, (novel._count.favorites || 0) / 300)
    score += popularityScore

    const avgRating = novel.ratings.length > 0
      ? novel.ratings.reduce((s, r) => s + r.score, 0) / novel.ratings.length
      : 0
    score += (avgRating / 5) * 0.5

    if (reasons.length === 0) {
      reasons.push('精选热门推荐')
    }

    return {
      novelId: novel.id,
      score,
      reasons: Array.from(new Set(reasons)).slice(0, 2)
    }
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export async function getSimilarUsersRecommendations(
  novelId: number,
  limit: number = 6
): Promise<RecommendationItem[]> {
  const favoriteUsers = await prisma.favorite.findMany({
    where: { novelId },
    select: { userId: true },
    take: 100
  })

  const userIds = favoriteUsers.map(f => f.userId)
  if (userIds.length === 0) {
    return getSimilarTagRecommendations(novelId, limit)
  }

  const otherFavorites = await prisma.favorite.findMany({
    where: {
      userId: { in: userIds },
      novelId: { not: novelId }
    },
    select: { novelId: true, userId: true },
    take: 500
  })

  const novelUserCounts: Record<number, Set<number>> = {}
  for (const fav of otherFavorites) {
    if (!novelUserCounts[fav.novelId]) {
      novelUserCounts[fav.novelId] = new Set()
    }
    novelUserCounts[fav.novelId].add(fav.userId)
  }

  const targetNovel = await prisma.novel.findUnique({
    where: { id: novelId },
    select: { title: true, tags: true }
  })

  const entries = Object.entries(novelUserCounts)
    .map(([nId, users]) => ({
      novelId: Number(nId),
      overlap: users.size,
      ratio: users.size / userIds.length
    }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, limit * 2)

  const novelIds = entries.map(e => e.novelId)
  const novels = await prisma.novel.findMany({
    where: { id: { in: novelIds } },
    include: {
      author: { select: { id: true, username: true } },
      tags: true
    }
  })

  const novelMap = new Map(novels.map(n => [n.id, n]))

  const results: RecommendationItem[] = entries
    .map(({ novelId, ratio }) => {
      const novel = novelMap.get(novelId)
      if (!novel) return null

      const tagSim = computeTagSimilarity(targetNovel?.tags || [], novel.tags)
      const score = ratio * 2 + tagSim

      const reasons: string[] = []
      if (ratio >= 0.1) {
        reasons.push(`看过《${targetNovel?.title}》的人还看了`)
      }
      if (tagSim > 0.3) {
        const commonTags = novel.tags.filter(t => targetNovel?.tags.includes(t)).slice(0, 2)
        if (commonTags.length > 0) {
          reasons.push(`相似标签：${commonTags.map(t => `#${t}#`).join(' ')}`)
        }
      }
      if (reasons.length === 0) {
        reasons.push('读者常一起阅读')
      }

      return {
        novelId,
        score,
        reasons: Array.from(new Set(reasons)).slice(0, 2)
      }
    })
    .filter((r): r is RecommendationItem => r !== null)

  return results.slice(0, limit)
}

export async function getSimilarTagRecommendations(
  novelId: number,
  limit: number = 6
): Promise<RecommendationItem[]> {
  const targetNovel = await prisma.novel.findUnique({
    where: { id: novelId },
    select: { title: true, tags: true, authorId: true }
  })

  if (!targetNovel) return []

  const candidates = await prisma.novel.findMany({
    where: {
      id: { not: novelId },
      tags: { hasSome: targetNovel.tags }
    },
    include: {
      author: { select: { id: true, username: true } },
      _count: { select: { favorites: true, ratings: true } },
      ratings: { select: { score: true } }
    },
    take: 200
  })

  return candidates
    .map(novel => {
      const tagSim = computeTagSimilarity(targetNovel.tags, novel.tags)
      const sameAuthor = novel.authorId === targetNovel.authorId

      let score = tagSim * 3
      const reasons: string[] = []

      const commonTags = novel.tags.filter(t => targetNovel.tags.includes(t)).slice(0, 2)
      if (commonTags.length > 0) {
        reasons.push(`同类型：${commonTags.map(t => `#${t}#`).join(' ')}`)
      }

      if (sameAuthor) {
        score += 1.5
        reasons.push(`与《${targetNovel.title}》同一作者`)
      }

      const popularityScore = Math.min(1, (novel._count.favorites || 0) / 300) * 0.5
      score += popularityScore

      const avgRating = novel.ratings.length > 0
        ? novel.ratings.reduce((s, r) => s + r.score, 0) / novel.ratings.length
        : 0
      score += (avgRating / 5) * 0.3

      if (reasons.length === 0) {
        reasons.push('风格相似作品')
      }

      return {
        novelId: novel.id,
        score,
        reasons: Array.from(new Set(reasons)).slice(0, 2)
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export async function fetchNovelsWithDetails(
  recommendations: RecommendationItem[],
  userId?: number
) {
  if (recommendations.length === 0) return []

  const novelIds = recommendations.map(r => r.novelId)
  const novels = await prisma.novel.findMany({
    where: { id: { in: novelIds } },
    include: {
      author: { select: { id: true, username: true, avatar: true } },
      _count: {
        select: {
          chapters: true,
          likes: true,
          favorites: true,
          ratings: true
        }
      },
      ratings: { select: { score: true } },
      ...(userId ? {
        likes: { where: { userId }, select: { id: true } },
        favorites: { where: { userId }, select: { id: true } }
      } : {})
    }
  })

  const novelMap = new Map(novels.map(n => [n.id, n]))

  return recommendations
    .map(rec => {
      const novel = novelMap.get(rec.novelId)
      if (!novel) return null

      const avgRating = novel.ratings.length > 0
        ? novel.ratings.reduce((s, r) => s + r.score, 0) / novel.ratings.length
        : 0

      return {
        ...novel,
        avgRating: Math.round(avgRating * 10) / 10,
        isLiked: userId ? (novel.likes?.length || 0) > 0 : false,
        isFavorited: userId ? (novel.favorites?.length || 0) > 0 : false,
        ratings: undefined,
        likes: undefined,
        favorites: undefined,
        recommendation: {
          score: rec.score,
          reasons: rec.reasons
        }
      }
    })
    .filter(n => n !== null)
}

export async function cachePersonalizedRecommendations(userId: number) {
  const recs = await getPersonalizedRecommendations(userId, 8)
  const data = JSON.stringify(recs)

  await prisma.recommendationCache.upsert({
    where: {
      cacheType_targetId: {
        cacheType: 'PERSONALIZED_FOR_YOU',
        targetId: userId
      }
    },
    update: { data },
    create: {
      cacheType: 'PERSONALIZED_FOR_YOU',
      targetId: userId,
      data
    }
  })

  return recs
}

export async function cacheNovelRecommendations(novelId: number) {
  const [similarUsers, similarTags] = await Promise.all([
    getSimilarUsersRecommendations(novelId, 6),
    getSimilarTagRecommendations(novelId, 6)
  ])

  await Promise.all([
    prisma.recommendationCache.upsert({
      where: {
        cacheType_targetId: {
          cacheType: 'SIMILAR_NOVEL_USERS',
          targetId: novelId
        }
      },
      update: { data: JSON.stringify(similarUsers) },
      create: {
        cacheType: 'SIMILAR_NOVEL_USERS',
        targetId: novelId,
        data: JSON.stringify(similarUsers)
      }
    }),
    prisma.recommendationCache.upsert({
      where: {
        cacheType_targetId: {
          cacheType: 'SIMILAR_NOVEL_TAGS',
          targetId: novelId
        }
      },
      update: { data: JSON.stringify(similarTags) },
      create: {
        cacheType: 'SIMILAR_NOVEL_TAGS',
        targetId: novelId,
        data: JSON.stringify(similarTags)
      }
    })
  ])

  return { similarUsers, similarTags }
}

export async function getCachedPersonalizedRecommendations(userId: number, limit: number = 8) {
  const cache = await prisma.recommendationCache.findUnique({
    where: {
      cacheType_targetId: {
        cacheType: 'PERSONALIZED_FOR_YOU',
        targetId: userId
      }
    }
  })

  let recs: RecommendationItem[]
  const CACHE_MAX_AGE = 6 * 60 * 60 * 1000

  if (cache && new Date(cache.updatedAt).getTime() > Date.now() - CACHE_MAX_AGE) {
    try {
      recs = JSON.parse(cache.data)
    } catch {
      recs = await cachePersonalizedRecommendations(userId)
    }
  } else {
    recs = await cachePersonalizedRecommendations(userId)
  }

  const feedbacks = await prisma.recommendationFeedback.findMany({
    where: { userId },
    select: { novelId: true }
  })
  const excludedIds = new Set(feedbacks.map(f => f.novelId))
  recs = recs.filter(r => !excludedIds.has(r.novelId))

  return recs.slice(0, limit)
}

export async function getCachedNovelRecommendations(novelId: number) {
  const CACHE_MAX_AGE = 12 * 60 * 60 * 1000
  const now = Date.now()

  const [usersCache, tagsCache] = await Promise.all([
    prisma.recommendationCache.findUnique({
      where: {
        cacheType_targetId: {
          cacheType: 'SIMILAR_NOVEL_USERS',
          targetId: novelId
        }
      }
    }),
    prisma.recommendationCache.findUnique({
      where: {
        cacheType_targetId: {
          cacheType: 'SIMILAR_NOVEL_TAGS',
          targetId: novelId
        }
      }
    })
  ])

  let similarUsers: RecommendationItem[]
  let similarTags: RecommendationItem[]

  if (usersCache && new Date(usersCache.updatedAt).getTime() > now - CACHE_MAX_AGE) {
    try {
      similarUsers = JSON.parse(usersCache.data)
    } catch {
      similarUsers = await getSimilarUsersRecommendations(novelId, 6)
    }
  } else {
    similarUsers = await getSimilarUsersRecommendations(novelId, 6)
  }

  if (tagsCache && new Date(tagsCache.updatedAt).getTime() > now - CACHE_MAX_AGE) {
    try {
      similarTags = JSON.parse(tagsCache.data)
    } catch {
      similarTags = await getSimilarTagRecommendations(novelId, 6)
    }
  } else {
    similarTags = await getSimilarTagRecommendations(novelId, 6)
  }

  return { similarUsers, similarTags }
}

export async function refreshAllRecommendationCaches(batchSize: number = 50) {
  console.log('[Recommendation] Starting cache refresh...')

  const activeUsers = await prisma.$queryRaw<{ userId: number }[]>`
    SELECT DISTINCT "userId"
    FROM (
      SELECT "userId" FROM read_history ORDER BY "updatedAt" DESC LIMIT 1000
      UNION
      SELECT "userId" FROM favorites ORDER BY "createdAt" DESC LIMIT 1000
    ) t
    LIMIT 2000
  `

  let processed = 0
  for (let i = 0; i < activeUsers.length; i += batchSize) {
    const batch = activeUsers.slice(i, i + batchSize)
    await Promise.all(
      batch.map(u =>
        cachePersonalizedRecommendations(u.userId).catch(e =>
          console.error(`[Recommendation] Error caching user ${u.userId}:`, e)
        )
      )
    )
    processed += batch.length
    console.log(`[Recommendation] Processed ${processed}/${activeUsers.length} users`)
  }

  const popularNovels = await prisma.novel.findMany({
    orderBy: [{ viewCount: 'desc' }],
    take: 500,
    select: { id: true }
  })

  processed = 0
  for (let i = 0; i < popularNovels.length; i += batchSize) {
    const batch = popularNovels.slice(i, i + batchSize)
    await Promise.all(
      batch.map(n =>
        cacheNovelRecommendations(n.id).catch(e =>
          console.error(`[Recommendation] Error caching novel ${n.id}:`, e)
        )
      )
    )
    processed += batch.length
    console.log(`[Recommendation] Processed ${processed}/${popularNovels.length} novels`)
  }

  console.log('[Recommendation] Cache refresh complete.')
}
