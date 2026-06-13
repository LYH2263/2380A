import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)

  const novelId = Number(body.novelId)
  const type = body.type || 'NOT_INTERESTED'

  if (!novelId || isNaN(novelId)) {
    throw createError({ statusCode: 400, message: '无效的小说ID' })
  }

  if (!['NOT_INTERESTED', 'DISLIKE'].includes(type)) {
    throw createError({ statusCode: 400, message: '无效的反馈类型' })
  }

  await prisma.recommendationFeedback.upsert({
    where: {
      userId_novelId_type: {
        userId: user.userId,
        novelId,
        type: type as any
      }
    },
    update: {},
    create: {
      userId: user.userId,
      novelId,
      type: type as any,
      recommendationType: body.recommendationType || undefined
    }
  })

  return { success: true }
})
