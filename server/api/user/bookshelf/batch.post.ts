import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { z } from 'zod'

const batchSchema = z.object({
  action: z.enum(['move_to_list', 'remove', 'mark_read', 'mark_unread', 'mark_finished']),
  favoriteIds: z.array(z.number()),
  bookListIds: z.array(z.number()).optional()
})

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)

  const validated = batchSchema.safeParse(body)
  if (!validated.success) {
    throw createError({
      statusCode: 400,
      message: '参数错误'
    })
  }

  const { action, favoriteIds, bookListIds } = validated.data

  const favorites = await prisma.favorite.findMany({
    where: {
      id: { in: favoriteIds },
      userId: user.userId
    }
  })

  if (favorites.length !== favoriteIds.length) {
    throw createError({
      statusCode: 400,
      message: '存在无效的收藏ID'
    })
  }

  switch (action) {
    case 'move_to_list': {
      if (!bookListIds || bookListIds.length === 0) {
        throw createError({
          statusCode: 400,
          message: '请选择书单'
        })
      }

      const bookLists = await prisma.bookList.findMany({
        where: {
          id: { in: bookListIds },
          userId: user.userId
        }
      })

      if (bookLists.length !== bookListIds.length) {
        throw createError({
          statusCode: 400,
          message: '存在无效的书单ID'
        })
      }

      const operations: any[] = []

      for (const bookListId of bookListIds) {
        for (const favoriteId of favoriteIds) {
          operations.push(
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
        }
      }

      await Promise.all(operations)
      break
    }

    case 'remove': {
      await prisma.favorite.deleteMany({
        where: {
          id: { in: favoriteIds },
          userId: user.userId
        }
      })
      break
    }

    case 'mark_read': {
      await prisma.favorite.updateMany({
        where: {
          id: { in: favoriteIds },
          userId: user.userId
        },
        data: {
          readingStatus: 'READING',
          lastReadAt: new Date()
        }
      })
      break
    }

    case 'mark_unread': {
      await prisma.favorite.updateMany({
        where: {
          id: { in: favoriteIds },
          userId: user.userId
        },
        data: {
          readingStatus: 'UNREAD',
          progress: 0
        }
      })
      break
    }

    case 'mark_finished': {
      await prisma.favorite.updateMany({
        where: {
          id: { in: favoriteIds },
          userId: user.userId
        },
        data: {
          readingStatus: 'FINISHED',
          progress: 100,
          lastReadAt: new Date()
        }
      })
      break
    }
  }

  return { success: true }
})
