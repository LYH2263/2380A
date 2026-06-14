import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { eventParticipationActionSchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: '无效的报名ID'
    })
  }

  const body = await readBody(event)
  const result = eventParticipationActionSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { status, rejectionReason } = result.data

  const participation = await prisma.eventParticipation.findUnique({ where: { id } })
  if (!participation) {
    throw createError({
      statusCode: 404,
      message: '报名记录不存在'
    })
  }

  const updateData: any = { status }
  if (status === 'APPROVED') {
    updateData.approvedAt = new Date()
    updateData.rejectionReason = null
  } else if (status === 'REJECTED') {
    updateData.rejectionReason = rejectionReason || null
    updateData.approvedAt = null
  }

  const updated = await prisma.eventParticipation.update({
    where: { id },
    data: updateData
  })

  return { success: true, participation: updated }
})
