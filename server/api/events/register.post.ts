import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { eventParticipationSchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)

  const result = eventParticipationSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { eventId, novelId } = result.data

  const eventData = await prisma.event.findUnique({ where: { id: eventId } })
  if (!eventData) {
    throw createError({
      statusCode: 404,
      message: '活动不存在'
    })
  }

  if (eventData.status === 'DRAFT' || eventData.status === 'CANCELLED') {
    throw createError({
      statusCode: 400,
      message: '活动不可报名'
    })
  }

  const now = new Date()
  if (now < new Date(eventData.registrationStartAt)) {
    throw createError({
      statusCode: 400,
      message: '报名尚未开始'
    })
  }
  if (now > new Date(eventData.registrationEndAt)) {
    throw createError({
      statusCode: 400,
      message: '报名已结束'
    })
  }

  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    include: {
      chapters: {
        select: { wordCount: true }
      }
    }
  })
  if (!novel) {
    throw createError({
      statusCode: 404,
      message: '小说不存在'
    })
  }

  if (novel.authorId !== user.userId) {
    throw createError({
      statusCode: 403,
      message: '只能报名自己的作品'
    })
  }

  if (novel.reviewStatus !== 'APPROVED') {
    throw createError({
      statusCode: 400,
      message: '作品需先通过审核才能报名'
    })
  }

  if (eventData.requireNew) {
    const novelCreatedAt = new Date(novel.createdAt)
    const regStartAt = new Date(eventData.registrationStartAt)
    if (novelCreatedAt < regStartAt) {
      throw createError({
        statusCode: 400,
        message: '该活动要求报名作品为活动期间新创建的'
      })
    }
  }

  const totalWords = novel.chapters.reduce((sum: number, c: any) => sum + (c.wordCount || 0), 0)
  if (eventData.minWordCount && totalWords < eventData.minWordCount) {
    throw createError({
      statusCode: 400,
      message: `作品字数不足，最少需要 ${eventData.minWordCount} 字`
    })
  }
  if (eventData.maxWordCount && totalWords > eventData.maxWordCount) {
    throw createError({
      statusCode: 400,
      message: `作品字数超出限制，最多 ${eventData.maxWordCount} 字`
    })
  }

  if (eventData.allowedTags && eventData.allowedTags.length > 0) {
    const hasValidTag = novel.tags.some((tag: string) => eventData.allowedTags.includes(tag))
    if (!hasValidTag) {
      throw createError({
        statusCode: 400,
        message: `作品标签不符合要求，允许的标签：${eventData.allowedTags.join('、')}`
      })
    }
  }

  const existing = await prisma.eventParticipation.findUnique({
    where: { eventId_novelId: { eventId, novelId } }
  })
  if (existing) {
    if (existing.status === 'WITHDRAWN') {
      const reactivated = await prisma.eventParticipation.update({
        where: { id: existing.id },
        data: {
          status: 'PENDING',
          rejectionReason: null,
          registeredAt: new Date()
        }
      })
      return { success: true, participation: reactivated, message: '重新报名成功，等待审核' }
    }
    throw createError({
      statusCode: 400,
      message: '该作品已报名此活动'
    })
  }

  const participation = await prisma.eventParticipation.create({
    data: {
      eventId,
      novelId,
      userId: user.userId,
      status: 'PENDING'
    }
  })

  return { success: true, participation, message: '报名成功，等待审核' }
})
