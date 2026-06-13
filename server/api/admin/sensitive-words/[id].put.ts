import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { sensitiveWordSchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: '无效的ID'
    })
  }

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
  if (existing && existing.id !== id) {
    throw createError({
      statusCode: 400,
      message: '该敏感词已存在'
    })
  }

  const sensitiveWord = await prisma.sensitiveWord.update({
    where: { id },
    data: {
      word,
      level: level || 'WARN',
      category: category || null
    }
  })

  return { success: true, sensitiveWord }
})
