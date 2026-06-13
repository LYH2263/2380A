import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)

  const tags: string[] = body.tags || []
  const markCompleted: boolean = body.markCompleted || false

  if (!Array.isArray(tags)) {
    throw createError({ statusCode: 400, message: '标签格式错误' })
  }

  const validTags = tags.filter(t => typeof t === 'string' && t.trim().length > 0).slice(0, 20)

  await prisma.$transaction(async (tx) => {
    await tx.userTagPreference.deleteMany({
      where: { userId: user.userId }
    })

    if (validTags.length > 0) {
      const data = validTags.map(tag => ({
        userId: user.userId,
        tag: tag.trim(),
        weight: 1.0
      }))
      await tx.userTagPreference.createMany({ data })
    }

    if (markCompleted) {
      await tx.user.update({
        where: { id: user.userId },
        data: { onboardingCompleted: true }
      })
    }
  })

  if (validTags.length > 0 || markCompleted) {
    try {
      const { cachePersonalizedRecommendations } = await import('~/server/utils/recommendation')
      cachePersonalizedRecommendations(user.userId)
    } catch (e) {}
  }

  return {
    success: true,
    selected: validTags
  }
})
