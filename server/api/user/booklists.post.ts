import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { z } from 'zod'

const bookListSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  color: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)

  const validated = bookListSchema.safeParse(body)
  if (!validated.success) {
    throw createError({
      statusCode: 400,
      message: '参数错误'
    })
  }

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

  const maxSortOrder = await prisma.bookList.aggregate({
    where: { userId: user.userId },
    _max: { sortOrder: true }
  })

  const bookList = await prisma.bookList.create({
    data: {
      userId: user.userId,
      name: validated.data.name,
      description: validated.data.description,
      color: validated.data.color,
      sortOrder: (maxSortOrder._max.sortOrder || 0) + 1
    },
    include: {
      _count: {
        select: { items: true }
      }
    }
  })

  return { bookList }
})
