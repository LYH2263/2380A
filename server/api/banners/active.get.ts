import prisma from '~/server/utils/prisma'

export default defineEventHandler(async () => {
  const now = new Date()

  const banners = await prisma.banner.findMany({
    where: {
      isActive: true,
      startAt: { lte: now },
      endAt: { gte: now }
    },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      linkUrl: true,
      startAt: true,
      endAt: true,
      sortOrder: true
    }
  })

  return { banners }
})
