import { requireAuth } from '~/server/utils/auth'
import shareService from '~/server/utils/shareService'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  const result = await shareService.listUserShares(user.userId, page, pageSize)

  return {
    shares: result.shares.map(s => ({
      id: s.id,
      token: s.token,
      type: s.type,
      bookListId: s.bookListId,
      title: s.title,
      description: s.description,
      shareUrl: `/s/${s.token}`,
      viewCount: s.viewCount,
      isExpired: s.isExpired,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt
    })),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize
  }
})
