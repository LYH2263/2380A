import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const query = getQuery(event)
  const status = query.status as string | undefined
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20

  const where: any = {}
  if (status && ['PENDING', 'RESOLVED', 'IGNORED'].includes(status)) {
    where.status = status
  }

  const [reports, total] = await Promise.all([
    prisma.commentReport.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true, avatar: true }
        },
        comment: {
          include: {
            user: {
              select: { id: true, username: true, avatar: true }
            }
          }
        }
      }
    }),
    prisma.commentReport.count({ where })
  ])

  return {
    reports,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
