import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { announcementSchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)

  const body = await readBody(event)
  const result = announcementSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { title, content, priority, target, startAt, endAt, isActive, sortOrder } = result.data

  if (new Date(endAt) <= new Date(startAt)) {
    throw createError({
      statusCode: 400,
      message: '结束时间必须晚于开始时间'
    })
  }

  const announcement = await prisma.announcement.create({
    data: {
      title,
      content,
      priority,
      target,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      isActive,
      sortOrder,
      createdById: admin.userId
    },
    include: {
      createdBy: {
        select: { id: true, username: true, email: true }
      }
    }
  })

  return { success: true, announcement }
})
