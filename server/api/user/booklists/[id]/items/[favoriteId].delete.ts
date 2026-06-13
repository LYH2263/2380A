import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const bookListId = Number(event.context.params?.id)
  const favoriteId = Number(event.context.params?.favoriteId)

  if (!bookListId || isNaN(bookListId) || !favoriteId || isNaN(favoriteId)) {
    throw createError({
      statusCode: 400,
      message: '无效的ID'
    })
  }

  const bookList = await prisma.bookList.findUnique({
    where: { id: bookListId }
  })

  if (!bookList || bookList.userId !== user.userId) {
    throw createError({
      statusCode: 404,
      message: '书单不存在'
    })
  }

  const favorite = await prisma.favorite.findUnique({
    where: { id: favoriteId }
  })

  if (!favorite || favorite.userId !== user.userId) {
    throw createError({
      statusCode: 404,
      message: '收藏不存在'
    })
  }

  await prisma.bookListItem.delete({
    where: {
      bookListId_favoriteId: {
        bookListId,
        favoriteId
      }
    }
  })

  return { success: true }
})
