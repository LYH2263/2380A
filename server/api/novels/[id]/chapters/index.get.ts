import prisma from '~/server/utils/prisma'
import { getAuthUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const novelId = Number(event.context.params?.id)
  const user = getAuthUser(event)

  if (!novelId || isNaN(novelId)) {
    throw createError({
      statusCode: 400,
      message: '无效的小说ID'
    })
  }

  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    select: { authorId: true }
  })

  const isAuthorOrAdmin = user && (novel?.authorId === user.userId || user.role === 'ADMIN')

  const where: any = { novelId }

  if (!isAuthorOrAdmin) {
    const now = new Date()
    where.OR = [
      { status: 'PUBLISHED' },
      {
        status: 'SCHEDULED',
        scheduledAt: { lte: now }
      }
    ]
  }

  const chapters = await prisma.chapter.findMany({
    where,
    orderBy: { order: 'asc' },
    select: {
      id: true,
      title: true,
      order: true,
      wordCount: true,
      createdAt: true,
      status: true,
      scheduledAt: true,
      publishedAt: true
    }
  })

  const processedChapters = chapters.map(ch => {
    let visibleStatus = ch.status
    if (ch.status === 'SCHEDULED' && ch.scheduledAt && new Date(ch.scheduledAt) <= new Date()) {
      visibleStatus = 'PUBLISHED'
    }
    if (!isAuthorOrAdmin) {
      return {
        id: ch.id,
        title: ch.title,
        order: ch.order,
        wordCount: ch.wordCount,
        createdAt: ch.createdAt,
        publishedAt: ch.publishedAt
      }
    }
    return { ...ch, effectiveStatus: visibleStatus }
  })

  return { chapters: processedChapters }
})

