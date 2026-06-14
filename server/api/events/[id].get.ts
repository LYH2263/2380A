import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: '无效的活动ID'
    })
  }

  const eventData = await prisma.event.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, username: true, avatar: true }
      },
      _count: {
        select: {
          participations: {
            where: {
              status: 'APPROVED'
            }
          }
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

  if (eventData.status === 'DRAFT') {
    throw createError({
      statusCode: 404,
      message: '活动不存在'
    })
  }

  return { event: eventData }
})
