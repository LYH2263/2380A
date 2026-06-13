import prisma from '~/server/utils/prisma'
import { getAuthUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const username = event.context.params?.username as string
  const currentUser = getAuthUser(event)
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20

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

  const [follows, total] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: user.id },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.follow.count({
      where: { followerId: user.id }
    })
  ])

  let followingIds: number[] = []
  if (currentUser) {
    const myFollows = await prisma.follow.findMany({
      where: { followerId: currentUser.userId },
      select: { followingId: true }
    })
    followingIds = myFollows.map(f => f.followingId)
  }

  const followingList = follows.map(follow => ({
    ...follow.following,
    isFollowing: followingIds.includes(follow.following.id)
  }))

  return {
    following: followingList,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
