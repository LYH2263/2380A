import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { authorNovelSchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const novelId = Number(event.context.params?.id)

  if (!novelId || isNaN(novelId)) {
    throw createError({
      statusCode: 400,
      message: '无效的小说ID'
    })
  }

  const novel = await prisma.novel.findUnique({
    where: { id: novelId }
  })

  if (!novel) {
    throw createError({
      statusCode: 404,
      message: '小说不存在'
    })
  }

  if (novel.authorId !== user.userId) {
    throw createError({
      statusCode: 403,
      message: '无权操作此小说'
    })
  }

  const body = await readBody(event)
  const result = authorNovelSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { title, description, cover, status, tags } = result.data

  const updatedNovel = await prisma.novel.update({
    where: { id: novelId },
    data: {
      title,
      description,
      cover: cover || null,
      status: status || novel.status,
      tags: tags || novel.tags
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

  return { success: true, novel: updatedNovel }
})
