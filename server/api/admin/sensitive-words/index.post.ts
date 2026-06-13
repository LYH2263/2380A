import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { sensitiveWordSchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const body = await readBody(event)
  const result = sensitiveWordSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { word, level, category } = result.data

  const existing = await prisma.sensitiveWord.findUnique({ where: { word } })
  if (existing) {
    throw createError({
      statusCode: 400,
      message: '该敏感词已存在'
    })
  }

  const sensitiveWord = await prisma.sensitiveWord.create({
    data: {
      word,
      level: level || 'WARN',
      category: category || null
    }
  })

  return { success: true, sensitiveWord }
})
