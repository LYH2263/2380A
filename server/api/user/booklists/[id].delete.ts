import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const bookListId = Number(event.context.params?.id)

  if (!bookListId || isNaN(bookListId)) {
    throw createError({
      statusCode: 400,
      message: '无效的书单ID'
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

  if (bookList.isDefault) {
    throw createError({
      statusCode: 400,
      message: '默认书单不能删除'
    })
  }

  await prisma.bookList.delete({
    where: { id: bookListId }
  })

  return { success: true }
})
