import { requireAuth } from '~/server/utils/auth'
import shareService from '~/server/utils/shareService'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)
  const expiresInDays = body.expiresInDays ? Number(body.expiresInDays) : undefined

  try {
    const result = await shareService.createBookshelfShare(user.userId, expiresInDays)
    return { success: true, ...result }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || '创建分享链接失败' })
  }
})
