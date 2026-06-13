import { requireAdmin } from '~/server/utils/auth'
import taskManager from '~/server/utils/taskManager'
import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 50, 200)
  const status = query.status as string
  const type = query.type as string

  const where: any = {
    OR: [{ adminId: admin.userId }, { userId: null }]
  }
  if (status) where.status = status
  if (type) where.type = type

  const [tasks, total] = await Promise.all([
    prisma.importExportTask.findMany({
      where,
      include: {
        user: { select: { id: true, username: true } },
        admin: { select: { id: true, username: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.importExportTask.count({ where })
  ])

  return {
    tasks: tasks.map(t => ({
      id: t.id,
      type: t.type,
      status: t.status,
      progress: t.progress,
      totalItems: t.totalItems,
      processedItems: t.processedItems,
      fileName: t.fileName,
      fileSize: t.fileSize,
      downloadUrl: t.downloadUrl,
      errorMessage: t.errorMessage,
      result: t.result ? JSON.parse(t.result) : null,
      userId: t.userId,
      username: t.user?.username,
      adminId: t.adminId,
      adminName: t.admin?.username,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      expiresAt: t.expiresAt
    })),
    total,
    page,
    pageSize
  }
})
