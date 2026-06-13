import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { authorNovelSchema } from '~/server/utils/validators'
import { recordNovelPublished } from '~/server/utils/activity'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)

  const result = authorNovelSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { title, description, cover, status, tags } = result.data

  const novel = await prisma.novel.create({
    data: {
      title,
      description,
      cover: cover || null,
      status: status || 'ONGOING',
      tags: tags || [],
      authorId: user.userId,
      isFeatured: false
    },
    include: {
      author: {
        select: { id: true, username: true, avatar: true }
      },
      _count: {
        select: { chapters: true, favorites: true }
      }
    }
  })

  recordNovelPublished(user.userId, novel.id, novel.title)

  return { success: true, novel }
})
