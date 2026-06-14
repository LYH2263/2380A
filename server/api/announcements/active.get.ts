import prisma from '~/server/utils/prisma'
import { getAuthUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = getAuthUser(event)
  const now = new Date()

  const whereClause: any = {
    isActive: true,
    startAt: { lte: now },
    endAt: { gte: now },
    target: { in: ['ALL'] }
  }

  if (user) {
    whereClause.target.in.push('USER')

    const authorNovelCount = await prisma.novel.count({
      where: { authorId: user.userId }
    })
    if (authorNovelCount > 0) {
      whereClause.target.in.push('AUTHOR')
    }
  }

  const dismissedIds: number[] = user
    ? (
        await prisma.announcementDismiss.findMany({
          where: { userId: user.userId },
          select: { announcementId: true }
        })
      ).map((d) => d.announcementId)
    : []

  if (dismissedIds.length > 0) {
    whereClause.id = { notIn: dismissedIds }
  }

  const priorityOrder: Record<string, number> = {
    URGENT: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  }

  const announcements = await prisma.announcement.findMany({
    where: whereClause,
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'desc' }
    ]
  })

  announcements.sort((a, b) => {
    const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
    return priorityDiff !== 0 ? priorityDiff : a.sortOrder - b.sortOrder
  })

  return { announcements }
})
