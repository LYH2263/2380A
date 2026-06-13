import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const novelId = Number(event.context.params?.novelId)

  if (!novelId || isNaN(novelId)) {
    throw createError({
      statusCode: 400,
      message: '无效的小说ID'
    })
  }

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

  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    select: { updatedAt: true }
  })

  if (!novel) {
    throw createError({
      statusCode: 404,
      message: '小说不存在'
    })
  }

  await prisma.favorite.update({
    where: { id: favorite.id },
    data: {
      lastViewedUpdateAt: novel.updatedAt,
      hasNewUpdate: false
    }
  })

  return { success: true }
})
