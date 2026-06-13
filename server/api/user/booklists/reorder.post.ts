import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { z } from 'zod'

const reorderSchema = z.object({
  items: z.array(z.object({
    id: z.number(),
    sortOrder: z.number()
  }))
})

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)

  const validated = reorderSchema.safeParse(body)
  if (!validated.success) {
    throw createError({
      statusCode: 400,
      message: '参数错误'
    })
  }

  const bookListIds = validated.data.items.map(item => item.id)
  
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

  const updates = validated.data.items.map(item => 
    prisma.bookList.update({
      where: { id: item.id },
      data: { sortOrder: item.sortOrder }
    })
  )

  await Promise.all(updates)

  return { success: true }
})
