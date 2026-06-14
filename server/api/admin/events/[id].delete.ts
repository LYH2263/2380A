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

  const existing = await prisma.event.findUnique({ where: { id } })
  if (!existing) {
    throw createError({
      statusCode: 404,
      message: '活动不存在'
    })
  }

  await prisma.eventDailyStat.deleteMany({ where: { eventId: id } })
  await prisma.eventVote.deleteMany({ where: { eventId: id } })
  await prisma.eventParticipation.deleteMany({ where: { eventId: id } })
  await prisma.event.delete({ where: { id } })

  return { success: true, message: '删除成功' }
})
