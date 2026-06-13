import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { checkSensitiveWords } from '~/server/utils/sensitiveWordFilter'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const novelId = Number(event.context.params?.id)
  const chapterId = Number(event.context.params?.chapterId)

  if (!novelId || isNaN(novelId) || !chapterId || isNaN(chapterId)) {
    throw createError({
      statusCode: 400,
      message: '无效的参数'
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

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId }
  })

  if (!chapter || chapter.novelId !== novelId) {
    throw createError({
      statusCode: 404,
      message: '章节不存在'
    })
  }

  if (chapter.reviewStatus === 'PENDING') {
    throw createError({
      statusCode: 400,
      message: '该章节正在审核中，请勿重复提交'
    })
  }

  if (chapter.reviewStatus === 'APPROVED') {
    throw createError({
      statusCode: 400,
      message: '该章节已通过审核，无需重新提交'
    })
  }

  const contentToCheck = `${chapter.title} ${chapter.content}`
  const sensitiveResult = await checkSensitiveWords(contentToCheck)

  if (sensitiveResult.shouldBlock) {
    const blockedWords = sensitiveResult.matchedWords.filter((w: any) => w.level === 'BLOCK').map((w: any) => w.word)
    throw createError({
      statusCode: 400,
      message: `内容包含违禁敏感词：${blockedWords.join('、')}，无法提交`
    })
  }

  const updatedChapter = await prisma.chapter.update({
    where: { id: chapterId },
    data: {
      reviewStatus: 'PENDING',
      rejectionReason: null,
      submittedAt: new Date()
    }
  })

  return {
    success: true,
    chapter: updatedChapter,
    warning: sensitiveResult.hasSensitiveWords
      ? `内容包含敏感词：${sensitiveResult.matchedWords.map((w: any) => w.word).join('、')}，已自动进入人工审核`
      : null
  }
})
