import prisma from '~/server/utils/prisma'
import { getAuthUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const username = event.context.params?.username as string
  const currentUser = getAuthUser(event)

  if (!username) {
    throw createError({
      statusCode: 400,
      message: '用户名不能为空'
    })
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      avatar: true,
      bio: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          novels: true,
          following: true,
          followers: true
        }
      }
    }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: '用户不存在'
    })
  }

  const [totalLikes, totalFavorites] = await Promise.all([
    prisma.like.count({
      where: {
        novel: {
          authorId: user.id
        }
      }
    }),
    prisma.favorite.count({
      where: {
        novel: {
          authorId: user.id
        }
      }
    })
  ])

  let isFollowing = false
  if (currentUser && currentUser.userId !== user.id) {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.userId,
          followingId: user.id
        }
      }
    })
    isFollowing = !!follow
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      role: user.role,
      createdAt: user.createdAt,
      stats: {
        novelsCount: user._count.novels,
        totalLikes,
        totalFavorites,
        followingCount: user._count.following,
        followersCount: user._count.followers
      },
      isFollowing
    }
  }
})
