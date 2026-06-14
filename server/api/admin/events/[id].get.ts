import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: '无效的ID'
    })
  }

  const eventData = await prisma.event.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          participations: true
        }
      }
    }
  })

  if (!eventData) {
    throw createError({
      statusCode: 404,
      message: '活动不存在'
    })
  }

  return { event: eventData }
})
