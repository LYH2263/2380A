import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { authorChapterSchema } from '~/server/utils/validators'
import { recordChapterPublished } from '~/server/utils/activity'

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
    where: { id: novelId },
    select: { authorId: true, title: true }
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
      message: '无权为此小说添加章节'
    })
  }

  const body = await readBody(event)
  const result = authorChapterSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { title, content, order, status, scheduledAt } = result.data

  const maxOrder = await prisma.chapter.findFirst({
    where: { novelId },
    orderBy: { order: 'desc' },
    select: { order: true }
  })

  const newOrder = order || (maxOrder?.order || 0) + 1
  const wordCount = content.replace(/\s/g, '').length

  const chapterData: any = {
    novelId,
    title,
    content,
    order: newOrder,
    wordCount,
    status: status || 'PUBLISHED'
  }

  if (status === 'SCHEDULED' && scheduledAt) {
    chapterData.scheduledAt = new Date(scheduledAt)
  }

  if ((status || 'PUBLISHED') === 'PUBLISHED') {
    chapterData.publishedAt = new Date()
  }

  const chapter = await prisma.chapter.create({
    data: chapterData
  })

  if ((status || 'PUBLISHED') === 'PUBLISHED') {
    recordChapterPublished(user.userId, novelId, chapter.id, novel.title, chapter.title)
  }

  return { success: true, chapter }
})
