import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const username = event.context.params?.username as string
  const query = getQuery(event)
  const limit = Number(query.limit) || 30

  if (!username) {
    throw createError({
      statusCode: 400,
      message: '用户名不能为空'
    })
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: '用户不存在'
    })
  }

  const activities = await prisma.activity.findMany({
    where: { userId: user.id },
    include: {
      novel: {
        select: {
          id: true,
          title: true,
          cover: true
        }
      },
      chapter: {
        select: {
          id: true,
          title: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const groupedActivities = activities.reduce((groups, activity) => {
    const activityDate = new Date(activity.createdAt)
    activityDate.setHours(0, 0, 0, 0)

    let groupKey = 'earlier'
    if (activityDate.getTime() === today.getTime()) {
      groupKey = 'today'
    } else if (activityDate.getTime() === yesterday.getTime()) {
      groupKey = 'yesterday'
    }

    if (!groups[groupKey]) {
      groups[groupKey] = []
    }

    groups[groupKey].push({
      id: activity.id,
      type: activity.type,
      createdAt: activity.createdAt,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
      novel: activity.novel,
      chapter: activity.chapter
    })

    return groups
  }, {} as Record<string, any[]>)

  return {
    activities: {
      today: groupedActivities.today || [],
      yesterday: groupedActivities.yesterday || [],
      earlier: groupedActivities.earlier || []
    }
  }
})
