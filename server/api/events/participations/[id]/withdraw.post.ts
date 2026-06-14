import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: '无效的报名ID'
    })
  }

  const participation = await prisma.eventParticipation.findUnique({
    where: { id },
    include: {
      event: {
        select: {
          id: true,
          status: true,
          registrationEndAt: true
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

  if (participation.userId !== user.userId) {
    throw createError({
      statusCode: 403,
      message: '无权操作此报名'
    })
  }

  if (participation.status === 'WITHDRAWN') {
    throw createError({
      statusCode: 400,
      message: '该报名已撤销'
    })
  }

  const now = new Date()
  if (now > new Date(participation.event.registrationEndAt)) {
    throw createError({
      statusCode: 400,
      message: '报名已截止，无法撤销'
    })
  }

  const updated = await prisma.eventParticipation.update({
    where: { id },
    data: {
      status: 'WITHDRAWN'
    }
  })

  return { success: true, participation: updated, message: '撤销成功' }
})
