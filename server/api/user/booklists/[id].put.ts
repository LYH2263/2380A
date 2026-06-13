import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { z } from 'zod'

const bookListSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional().nullable(),
  color: z.string().optional().nullable()
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

  const validated = bookListSchema.safeParse(body)
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

  if (validated.data.name && validated.data.name !== bookList.name) {
    const existing = await prisma.bookList.findUnique({
      where: {
        userId_name: {
          userId: user.userId,
          name: validated.data.name
        }
      }
    })

    if (existing) {
      throw createError({
        statusCode: 400,
        message: '书单名称已存在'
      })
    }
  }

  const updatedBookList = await prisma.bookList.update({
    where: { id: bookListId },
    data: validated.data,
    include: {
      _count: {
        select: { items: true }
      }
    }
  })

  return { bookList: updatedBookList }
})
