import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const currentUser = requireAuth(event)
  const username = event.context.params?.username as string

  if (!username) {
    throw createError({
      statusCode: 400,
      message: '用户名不能为空'
    })
  }

  const targetUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true }
  })

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      message: '用户不存在'
    })
  }

  if (currentUser.userId === targetUser.id) {
    throw createError({
      statusCode: 400,
      message: '不能关注自己'
    })
  }

  const existingFollow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: currentUser.userId,
        followingId: targetUser.id
      }
    }
  })

  if (existingFollow) {
    await prisma.follow.delete({
      where: { id: existingFollow.id }
    })
    return { success: true, following: false }
  } else {
    await prisma.follow.create({
      data: {
        followerId: currentUser.userId,
        followingId: targetUser.id
      }
    })
    return { success: true, following: true }
  }
})
