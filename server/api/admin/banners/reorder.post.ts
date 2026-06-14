import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { bannerReorderSchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const body = await readBody(event)
  const validated = bannerReorderSchema.safeParse(body)
  if (!validated.success) {
    throw createError({
      statusCode: 400,
      message: '参数错误'
    })
  }

  const bannerIds = validated.data.items.map(item => item.id)

  const banners = await prisma.banner.findMany({
    where: { id: { in: bannerIds } }
  })

  if (banners.length !== bannerIds.length) {
    throw createError({
      statusCode: 400,
      message: '存在无效的Banner ID'
    })
  }

  const updates = validated.data.items.map(item =>
    prisma.banner.update({
      where: { id: item.id },
      data: { sortOrder: item.sortOrder }
    })
  )

  await Promise.all(updates)

  return { success: true }
})
