import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const query = getQuery(event)
  
  const search = (query.search as string) || ''
  const sortBy = (query.sortBy as string) || 'lastReadAt'
  const sortOrder = (query.sortOrder as string) || 'desc'
  const bookListId = query.bookListId ? Number(query.bookListId) : undefined

  const sortFieldMap: Record<string, string> = {
    lastReadAt: 'lastReadAt',
    favoritedAt: 'createdAt',
    updatedAt: 'novel.updatedAt',
    title: 'novel.title'
  }

  const orderBy: any = {}
  const sortField = sortFieldMap[sortBy] || sortFieldMap.lastReadAt
  
  if (sortField === 'novel.updatedAt') {
    orderBy.novel = { updatedAt: sortOrder }
  } else if (sortField === 'novel.title') {
    orderBy.novel = { title: sortOrder }
  } else {
    orderBy[sortField] = sortOrder
  }

  const where: any = {
    userId: user.userId,
    novel: {
      title: {
        contains: search,
        mode: 'insensitive'
      }
    }
  }

  if (bookListId) {
    where.bookListItems = {
      some: {
        bookListId
      }
    }
  }

  const [favorites, bookLists, userSettings] = await Promise.all([
    prisma.favorite.findMany({
      where,
      include: {
        novel: {
          include: {
            author: {
              select: { id: true, username: true, avatar: true }
            },
            chapters: {
              select: { id: true, order: true },
              orderBy: { order: 'asc' }
            },
            _count: {
              select: { chapters: true, likes: true }
            }
          }
        },
        bookListItems: {
          include: {
            bookList: {
              select: { id: true, name: true, color: true }
            }
          }
        }
      },
      orderBy
    }),
    prisma.bookList.findMany({
      where: { userId: user.userId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { items: true }
        }
      }
    }),
    prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        bookshelfViewMode: true,
        bookshelfSortBy: true,
        bookshelfSortOrder: true
      }
    })
  ])

  const booksWithProgress = favorites.map(fav => {
    const totalChapters = fav.novel._count?.chapters || 0
    const lastChapterOrder = fav.lastChapterId ? fav.novel.chapters?.find((c: any) => c.id === fav.lastChapterId)?.order || 0 : 0
    const progressPercent = totalChapters > 0 ? Math.round((lastChapterOrder / totalChapters) * 100) : 0
    
    const hasNewUpdate = fav.lastViewedUpdateAt 
      ? fav.novel.updatedAt > fav.lastViewedUpdateAt 
      : totalChapters > 0

    return {
      ...fav,
      novel: {
        ...fav.novel,
        progress: progressPercent,
        totalChapters,
        lastChapterOrder
      },
      hasNewUpdate
    }
  })

  return {
    favorites: booksWithProgress,
    bookLists,
    settings: userSettings
  }
})
