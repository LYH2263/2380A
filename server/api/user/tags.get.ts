import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)

  const preferences = await prisma.userTagPreference.findMany({
    where: { userId: user.userId },
    select: { tag: true, weight: true },
    orderBy: { weight: 'desc' }
  })

  const topTags = await prisma.$queryRaw<{ tag: string; count: number }[]>`
    SELECT unnest(tags) AS tag, COUNT(*) AS count
    FROM novels
    GROUP BY tag
    ORDER BY count DESC
    LIMIT 50
  `

  return {
    selected: preferences.map(p => ({ tag: p.tag, weight: p.weight })),
    available: topTags
  }
})
