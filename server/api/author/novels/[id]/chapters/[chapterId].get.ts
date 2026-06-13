import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const novelId = Number(event.context.params?.id)
  const chapterId = Number(event.context.params?.chapterId)

  if (!novelId || isNaN(novelId) || !chapterId || isNaN(chapterId)) {
    throw createError({
      statusCode: 400,
      message: '无效的ID'
    })
  }

  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    select: { authorId: true }
  })

  if (!novel || novel.authorId !== user.userId) {
    throw createError({
      statusCode: 403,
      message: '无权查看此章节'
    })
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId, novelId }
  })

  if (!chapter) {
    throw createError({
      statusCode: 404,
      message: '章节不存在'
    })
  }

  return { chapter }
})
