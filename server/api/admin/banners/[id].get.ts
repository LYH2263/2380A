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

  const banner = await prisma.banner.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, username: true }
      }
    }
  })

  if (!banner) {
    throw createError({
      statusCode: 404,
      message: 'Banner不存在'
    })
  }

  return { banner }
})
