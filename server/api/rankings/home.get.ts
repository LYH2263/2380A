import { getHomeRankings } from '~/server/utils/ranking'

export default defineEventHandler(async (event) => {
  const rankings = await getHomeRankings()
  return { rankings }
})
