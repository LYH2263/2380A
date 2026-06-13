import shareService from '~/server/utils/shareService'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) {
    throw createError({ statusCode: 400, message: '缺少分享令牌' })
  }

  const data = await shareService.getShare(token)
  if (!data) {
    throw createError({ statusCode: 404, message: '分享链接不存在或已过期' })
  }

  return { data }
})
