import prisma from '~/server/utils/prisma'
import { getAuthUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const novelId = Number(event.context.params?.id)
  const chapterId = Number(event.context.params?.chapterId)
  const user = getAuthUser(event)

  if (!novelId || isNaN(novelId) || !chapterId || isNaN(chapterId)) {
    throw createError({
      statusCode: 400,
      message: '无效的参数'
    })
  }

  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    select: { authorId: true }
  })

  const isAuthorOrAdmin = user && (novel?.authorId === user.userId || user.role === 'ADMIN')

  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      novelId
    },
    include: {
      novel: {
        select: {
          id: true,
          title: true,
          reviewStatus: true,
          author: {
            select: { id: true, username: true, avatar: true }
          }
        }
      },
      comments: {
        include: {
          user: {
            select: { id: true, username: true, avatar: true }
          },
          replies: {
            include: {
              user: {
                select: { id: true, username: true, avatar: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          _count: { select: { likes: true } }
        },
        where: { parentId: null, reviewStatus: 'APPROVED' },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }]
      }
    }
  })

  if (!chapter) {
    throw createError({
      statusCode: 404,
      message: '章节不存在'
    })
  }

  if (!isAuthorOrAdmin) {
    if (chapter.novel.reviewStatus !== 'APPROVED') {
      throw createError({
        statusCode: 403,
        message: '该小说正在审核中，暂不可见'
      })
    }
    if (chapter.reviewStatus !== 'APPROVED') {
      throw createError({
        statusCode: 403,
        message: '该章节正在审核中，暂不可见'
      })
    }
    const now = new Date()
    if (chapter.status === 'DRAFT') {
      throw createError({
        statusCode: 403,
        message: '该章节暂未发布'
      })
    }
    if (chapter.status === 'SCHEDULED' && chapter.scheduledAt && new Date(chapter.scheduledAt) > now) {
      throw createError({
        statusCode: 403,
        message: '该章节尚未到发布时间'
      })
    }
  }

  const chapterFilter: any = { novelId }
  if (!isAuthorOrAdmin) {
    const now = new Date()
    chapterFilter.AND = [
      { reviewStatus: 'APPROVED' },
      {
        OR: [
          { status: 'PUBLISHED' },
          { status: 'SCHEDULED', scheduledAt: { lte: now }
        ]
      }
    ]
  }

  const [prevChapter, nextChapter] = await Promise.all([
    prisma.chapter.findFirst({
      where: {
        ...chapterFilter,
        order: { lt: chapter.order }
      },
      orderBy: { order: 'desc' },
      select: { id: true, title: true, order: true }
    }),
    prisma.chapter.findFirst({
      where: {
        ...chapterFilter,
        order: { gt: chapter.order }
      },
      orderBy: { order: 'asc' },
      select: { id: true, title: true, order: true }
    })
  ])

  if (user && isAuthorOrAdmin) {
    await prisma.chapter.update({
      where: { id: chapterId },
      data: { viewCount: { increment: 1 } }
    })
  } else if (user) {
    await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        viewCount: { increment: 1 },
        readCount: { increment: 1 }
      }
    })
  }

  return {
    ...chapter,
    prevChapter,
    nextChapter
  }
})

