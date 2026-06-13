import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)

  const bookLists = await prisma.bookList.findMany({
    where: { userId: user.userId },
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: {
        select: { items: true }
      },
      items: {
        take: 3,
        include: {
          favorite: {
            include: {
              novel: {
                select: { id: true, title: true, cover: true }
              }
            }
          }
        }
      }
    }
  })

  return { bookLists }
})
