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

  const announcement = await prisma.announcement.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, username: true, email: true }
      }
    }
  })

  if (!announcement) {
    throw createError({
      statusCode: 404,
      message: '公告不存在'
    })
  }

  return announcement
})
