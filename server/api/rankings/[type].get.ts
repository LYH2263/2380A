import { getRankingWithTrend, RANKING_TYPES, RANKING_PERIODS } from '~/server/utils/ranking'

export default defineEventHandler(async (event) => {
  const type = getRouterParam(event, 'type')?.toUpperCase() as string
  const query = getQuery(event)

  const period = (query.period as string)?.toUpperCase() || 'ALL'
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20

  if (!type || !Object.values(RANKING_TYPES).includes(type as any)) {
    throw createError({
      statusCode: 400,
      message: '无效的排行榜类型'
    })
  }

  if (!Object.values(RANKING_PERIODS).includes(period as any)) {
    throw createError({
      statusCode: 400,
      message: '无效的周期类型'
    })
  }

  if (page < 1) {
    throw createError({
      statusCode: 400,
      message: '页码必须大于0'
    })
  }

  if (limit < 1 || limit > 100) {
    throw createError({
      statusCode: 400,
      message: '每页数量必须在1-100之间'
    })
  }

  const result = await getRankingWithTrend(
    type as any,
    period as any,
    page,
    limit
  )

  return {
    ...result,
    totalPages: Math.ceil(result.total / limit)
  }
})
