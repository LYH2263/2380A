import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { z } from 'zod'

const progressSchema = z.object({
  novelId: z.number(),
  chapterId: z.number(),
  progress: z.number().min(0).max(100)
})

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)

  const validated = progressSchema.safeParse(body)
  if (!validated.success) {
    throw createError({
      statusCode: 400,
      message: '参数错误'
    })
  }

  const { novelId, chapterId, progress } = validated.data

  const favorite = await prisma.favorite.findUnique({
    where: {
      userId_novelId: {
        userId: user.userId,
        novelId
      }
    }
  })

  if (!favorite) {
    throw createError({
      statusCode: 404,
      message: '未收藏该小说'
    })
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId }
  })

  if (!chapter || chapter.novelId !== novelId) {
    throw createError({
      statusCode: 404,
      message: '章节不存在'
    })
  }

  const totalChapters = await prisma.chapter.count({
    where: { novelId }
  })

  const progressPercent = totalChapters > 0 
    ? Math.min(100, Math.round((chapter.order / totalChapters) * 100))
    : 0

  const updatedFavorite = await prisma.favorite.update({
    where: { id: favorite.id },
    data: {
      lastChapterId: chapterId,
      lastReadAt: new Date(),
      progress: progressPercent,
      readingStatus: progressPercent >= 100 ? 'FINISHED' : 'READING'
    }
  })

  await prisma.readHistory.upsert({
    where: {
      userId_novelId: {
        userId: user.userId,
        novelId
      }
    },
    create: {
      userId: user.userId,
      novelId,
      lastChapterId: chapterId,
      progress: progressPercent
    },
    update: {
      lastChapterId: chapterId,
      progress: progressPercent,
      updatedAt: new Date()
    }
  })

  return { success: true, favorite: updatedFavorite }
})
