import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const query = getQuery(event)
  
  const search = (query.search as string) || ''
  const sortBy = (query.sortBy as string) || 'createdAt'
  const sortOrder = (query.sortOrder as string) || 'desc'
  const bookListId = query.bookListId ? Number(query.bookListId) : undefined

  const where: any = {
    userId: user.userId
  }

  if (search) {
    where.novel = {
      title: {
        contains: search,
        mode: 'insensitive' as const
      }
    }
  }

  if (bookListId) {
    try {
      where.bookListItems = {
        some: {
          bookListId
        }
      }
    } catch (e) {
      // 如果字段不存在则忽略
    }
  }

  let orderBy: any = { createdAt: sortOrder }

  try {
    switch (sortBy) {
      case 'lastReadAt':
        orderBy = [{ lastReadAt: sortOrder, nulls: 'last' }, { createdAt: sortOrder }]
        break
      case 'favoritedAt':
      case 'createdAt':
        orderBy = { createdAt: sortOrder }
        break
      case 'updatedAt':
        orderBy = { novel: { updatedAt: sortOrder } }
        break
      case 'title':
        orderBy = { novel: { title: sortOrder } }
        break
      default:
        orderBy = { createdAt: sortOrder }
    }
  } catch (e) {
    orderBy = { createdAt: sortOrder }
  }

  const novelInclude: any = {
    author: {
      select: { id: true, username: true, avatar: true }
    },
    chapters: {
      select: { id: true, order: true },
      orderBy: { order: 'asc' as const }
    },
    _count: {
      select: { chapters: true, likes: true }
    }
  }

  const favoriteInclude: any = {
    novel: {
      include: novelInclude
    }
  }

  try {
    favoriteInclude.bookListItems = {
      include: {
        bookList: {
          select: { id: true, name: true, color: true }
        }
      }
    }
  } catch (e) {
    // 忽略
  }

  const [favorites, bookLists, userSettings] = await Promise.all([
    prisma.favorite.findMany({
      where,
      include: favoriteInclude,
      orderBy
    }),
    (async () => {
      try {
        return await prisma.bookList.findMany({
          where: { userId: user.userId },
          orderBy: { sortOrder: 'asc' as const },
          include: {
            _count: {
              select: { items: true }
            }
          }
        })
      } catch (e) {
        return []
      }
    })(),
    (async () => {
      try {
        return await prisma.user.findUnique({
          where: { id: user.userId },
          select: {
            bookshelfViewMode: true,
            bookshelfSortBy: true,
            bookshelfSortOrder: true
          }
        })
      } catch (e) {
        return null
      }
    })()
  ])

  const booksWithProgress = favorites.map((fav: any) => {
    const totalChapters = fav.novel?._count?.chapters || 0
    let lastChapterOrder = 0
    
    if (fav.lastChapterId && fav.novel?.chapters) {
      const found = fav.novel.chapters.find((c: any) => c.id === fav.lastChapterId)
      lastChapterOrder = found?.order || 0
    }
    
    const progressPercent = totalChapters > 0 
      ? Math.min(100, Math.round((lastChapterOrder / totalChapters) * 100)) 
      : (fav.progress || 0)
    
    let hasNewUpdate = false
    try {
      hasNewUpdate = fav.lastViewedUpdateAt 
        ? new Date(fav.novel?.updatedAt) > new Date(fav.lastViewedUpdateAt) 
        : totalChapters > 0
    } catch (e) {
      hasNewUpdate = false
    }

    const novel = {
      ...(fav.novel || {}),
      progress: progressPercent,
      totalChapters,
      lastChapterOrder
    }
    delete novel.chapters

    const result: any = {
      ...fav,
      novel,
      hasNewUpdate
    }

    return result
  })

  return {
    favorites: booksWithProgress,
    bookLists,
    settings: userSettings
  }
})
