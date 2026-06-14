import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { announcementDismissSchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)

  const body = await readBody(event)
  const result = announcementDismissSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { announcementId } = result.data

  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId }
  })
  if (!announcement) {
    throw createError({
      statusCode: 404,
      message: '公告不存在'
    })
  }

  const existing = await prisma.announcementDismiss.findUnique({
    where: {
      userId_announcementId: {
        userId: user.userId,
        announcementId
      }
    }
  })
  if (existing) {
    return { success: true, message: '已标记为不再显示' }
  }

  await prisma.announcementDismiss.create({
    data: {
      userId: user.userId,
      announcementId
    }
  })

  return { success: true, message: '已标记为不再显示' }
})
