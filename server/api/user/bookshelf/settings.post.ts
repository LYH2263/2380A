import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { z } from 'zod'

const settingsSchema = z.object({
  viewMode: z.enum(['grid', 'list', 'compact']).optional(),
  sortBy: z.enum(['lastReadAt', 'favoritedAt', 'updatedAt', 'title']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
})

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)

  const validated = settingsSchema.safeParse(body)
  if (!validated.success) {
    throw createError({
      statusCode: 400,
      message: '参数错误'
    })
  }

  const updateData: any = {}
  if (validated.data.viewMode) {
    updateData.bookshelfViewMode = validated.data.viewMode
  }
  if (validated.data.sortBy) {
    updateData.bookshelfSortBy = validated.data.sortBy
  }
  if (validated.data.sortOrder) {
    updateData.bookshelfSortOrder = validated.data.sortOrder
  }

  await prisma.user.update({
    where: { id: user.userId },
    data: updateData
  })

  return { success: true }
})
