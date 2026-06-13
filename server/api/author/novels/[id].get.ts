import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const novelId = Number(event.context.params?.id)

  if (!novelId || isNaN(novelId)) {
    throw createError({
      statusCode: 400,
      message: '无效的小说ID'
    })
  }

  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    include: {
      _count: {
        select: { chapters: true, favorites: true }
      }
    }
  })

  if (!novel) {
    throw createError({
      statusCode: 404,
      message: '小说不存在'
    })
  }

  if (novel.authorId !== user.userId) {
    throw createError({
      statusCode: 403,
      message: '无权查看此小说'
    })
  }

  return { novel }
})
