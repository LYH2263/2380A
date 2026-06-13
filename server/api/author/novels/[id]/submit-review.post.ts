import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { checkSensitiveWords } from '~/server/utils/sensitiveWordFilter'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const novelId = Number(event.context.params?.id)

  if (!novelId || isNaN(novelId)) {
    throw createError({
      statusCode: 400,
      message: '无效的小说ID'
    })
  }

  const novel = await prisma.novel.findUnique({
    where: { id: novelId }
  })

  if (!novel) {
    throw createError({
      statusCode: 404,
      message: '小说不存在'
    })
  }

  if (novel.authorId !== user.userId) {
    throw createError({
      statusCode: 403,
      message: '无权操作此小说'
    })
  }

  if (novel.reviewStatus === 'PENDING') {
    throw createError({
      statusCode: 400,
      message: '该小说正在审核中，请勿重复提交'
    })
  }

  if (novel.reviewStatus === 'APPROVED') {
    throw createError({
      statusCode: 400,
      message: '该小说已通过审核，无需重新提交'
    })
  }

  const contentToCheck = `${novel.title} ${novel.description} ${novel.tags?.join(' ') || ''}`
  const sensitiveResult = await checkSensitiveWords(contentToCheck)

  if (sensitiveResult.shouldBlock) {
    const blockedWords = sensitiveResult.matchedWords.filter((w: any) => w.level === 'BLOCK').map((w: any) => w.word)
    throw createError({
      statusCode: 400,
      message: `内容包含违禁敏感词：${blockedWords.join('、')}，无法提交`
    })
  }

  const updatedNovel = await prisma.novel.update({
    where: { id: novelId },
    data: {
      reviewStatus: 'PENDING',
      rejectionReason: null,
      submittedAt: new Date()
    }
  })

  return {
    success: true,
    novel: updatedNovel,
    warning: sensitiveResult.hasSensitiveWords
      ? `内容包含敏感词：${sensitiveResult.matchedWords.map((w: any) => w.word).join('、')}，已自动进入人工审核`
      : null
  }
})
