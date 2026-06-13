import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { z } from 'zod'

const itemsSchema = z.object({
  favoriteIds: z.array(z.number())
})

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const bookListId = Number(event.context.params?.id)
  const body = await readBody(event)

  if (!bookListId || isNaN(bookListId)) {
    throw createError({
      statusCode: 400,
      message: '无效的书单ID'
    })
  }

  const validated = itemsSchema.safeParse(body)
  if (!validated.success) {
    throw createError({
      statusCode: 400,
      message: '参数错误'
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

  const favorites = await prisma.favorite.findMany({
    where: {
      id: { in: validated.data.favoriteIds },
      userId: user.userId
    }
  })

  if (favorites.length !== validated.data.favoriteIds.length) {
    throw createError({
      statusCode: 400,
      message: '存在无效的收藏ID'
    })
  }

  const createItems = validated.data.favoriteIds.map(favoriteId =>
    prisma.bookListItem.upsert({
      where: {
        bookListId_favoriteId: {
          bookListId,
          favoriteId
        }
      },
      create: {
        bookListId,
        favoriteId
      },
      update: {}
    })
  )

  await Promise.all(createItems)

  return { success: true }
})
