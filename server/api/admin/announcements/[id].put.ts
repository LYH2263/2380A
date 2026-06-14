import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { announcementSchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: '无效的ID'
    })
  }

  const existing = await prisma.announcement.findUnique({ where: { id } })
  if (!existing) {
    throw createError({
      statusCode: 404,
      message: '公告不存在'
    })
  }

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

  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      title,
      content,
      priority,
      target,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      isActive,
      sortOrder
    },
    include: {
      createdBy: {
        select: { id: true, username: true, email: true }
      }
    }
  })

  return { success: true, announcement }
})
