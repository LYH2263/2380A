import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { eventSchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const body = await readBody(event)
  const result = eventSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const data = result.data

  const newEvent = await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      rules: data.rules,
      coverImage: data.coverImage || null,
      type: data.type,
      status: data.status,
      registrationStartAt: new Date(data.registrationStartAt),
      registrationEndAt: new Date(data.registrationEndAt),
      eventStartAt: new Date(data.eventStartAt),
      eventEndAt: new Date(data.eventEndAt),
      minWordCount: data.minWordCount || null,
      maxWordCount: data.maxWordCount || null,
      allowedTags: data.allowedTags,
      requireNew: data.requireNew,
      sortOrder: data.sortOrder
    }
  })

  return { success: true, event: newEvent }
})
