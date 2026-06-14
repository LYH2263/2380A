import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { eventVoteSchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)

  const result = eventVoteSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { participationId } = result.data

  const participation = await prisma.eventParticipation.findUnique({
    where: { id: participationId },
    include: {
      event: {
        select: {
          id: true,
          type: true,
          status: true,
          eventStartAt: true,
          eventEndAt: true
        }
      }
    }
  })

  if (!participation) {
    throw createError({
      statusCode: 404,
      message: '报名记录不存在'
    })
  }

  if (participation.status !== 'APPROVED') {
    throw createError({
      statusCode: 400,
      message: '该作品尚未通过审核，无法投票'
    })
  }

  if (participation.event.type !== 'VOTING') {
    throw createError({
      statusCode: 400,
      message: '该活动不是投票类型'
    })
  }

  if (participation.event.status !== 'ONGOING') {
    throw createError({
      statusCode: 400,
      message: '投票未开始或已结束'
    })
  }

  const now = new Date()
  if (now < new Date(participation.event.eventStartAt)) {
    throw createError({
      statusCode: 400,
      message: '投票尚未开始'
    })
  }
  if (now > new Date(participation.event.eventEndAt)) {
    throw createError({
      statusCode: 400,
      message: '投票已结束'
    })
  }

  if (participation.userId === user.userId) {
    throw createError({
      statusCode: 400,
      message: '不能给自己的作品投票'
    })
  }

  const existingVote = await prisma.eventVote.findUnique({
    where: {
      eventId_participationId_userId: {
        eventId: participation.eventId,
        participationId,
        userId: user.userId
      }
    }
  })

  if (existingVote) {
    throw createError({
      statusCode: 400,
      message: '您已为该作品投过票'
    })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const eventId = participation.eventId

  await prisma.$transaction([
    prisma.eventVote.create({
      data: {
        eventId,
        participationId,
        userId: user.userId
      }
    }),
    prisma.eventParticipation.update({
      where: { id: participationId },
      data: {
        voteCount: { increment: 1 }
      }
    }),
    prisma.eventDailyStat.upsert({
      where: {
        eventId_participationId_date: {
          eventId,
          participationId,
          date: today
        }
      },
      update: {
        voteCount: { increment: 1 }
      },
      create: {
        eventId,
        participationId,
        date: today,
        voteCount: 1
      }
    })
  ])

  return { success: true, message: '投票成功' }
})
