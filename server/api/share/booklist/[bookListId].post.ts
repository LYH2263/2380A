import { requireAuth } from '~/server/utils/auth'
import shareService from '~/server/utils/shareService'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const bookListId = Number(getRouterParam(event, 'bookListId'))
  const body = await readBody(event)
  const expiresInDays = body?.expiresInDays ? Number(body.expiresInDays) : undefined

  try {
    const result = await shareService.createBooklistShare(user.userId, bookListId, expiresInDays)
    return { success: true, ...result }
  } catch (err: any) {
    if (err.message === '无权分享此书单') {
      throw createError({ statusCode: 403, message: err.message })
    }
    if (err.message === '书单不存在') {
      throw createError({ statusCode: 404, message: err.message })
    }
    throw createError({ statusCode: 500, message: err.message || '创建分享链接失败' })
  }
})
