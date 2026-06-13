import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const novelId = Number(event.context.params?.id)
  const query = getQuery(event)
  const statusFilter = query.status as string || ''

  if (!novelId || isNaN(novelId)) {
    throw createError({
      statusCode: 400,
      message: '无效的小说ID'
    })
  }

  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    select: { authorId: true }
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
      message: '无权查看此小说的章节'
    })
  }

  const where: any = { novelId }
  if (statusFilter && ['DRAFT', 'PUBLISHED', 'SCHEDULED'].includes(statusFilter)) {
    where.status = statusFilter
  }

  const chapters = await prisma.chapter.findMany({
    where,
    orderBy: { order: 'asc' },
    include: {
      _count: {
        select: { comments: true }
      }
    }
  })

  return { chapters }
})
