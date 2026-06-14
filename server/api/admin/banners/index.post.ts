import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { bannerSchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const user = requireAdmin(event)

  const body = await readBody(event)
  const result = bannerSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { title, imageUrl, linkUrl, startAt, endAt, sortOrder, isActive } = result.data

  if (new Date(startAt) >= new Date(endAt)) {
    throw createError({
      statusCode: 400,
      message: '生效时间必须早于过期时间'
    })
  }

  const banner = await prisma.banner.create({
    data: {
      title,
      imageUrl,
      linkUrl,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      sortOrder: sortOrder ?? 0,
      isActive: isActive ?? true,
      createdById: user.userId
    }
  })

  return { success: true, banner }
})
