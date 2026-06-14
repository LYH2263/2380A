import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { authorChapterSchema } from '~/server/utils/validators'
import { recordChapterPublished } from '~/server/utils/activity'
import { checkSensitiveWords } from '~/server/utils/sensitiveWordFilter'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const novelId = Number(event.context.params?.id)
  const chapterId = Number(event.context.params?.chapterId)

  if (!novelId || isNaN(novelId) || !chapterId || isNaN(chapterId)) {
    throw createError({
      statusCode: 400,
      message: '无效的ID'
    })
  }

  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    select: { authorId: true, title: true }
  })

  if (!novel || novel.authorId !== user.userId) {
    throw createError({
      statusCode: 403,
      message: '无权操作此章节'
    })
  }

  const existingChapter = await prisma.chapter.findUnique({
    where: { id: chapterId, novelId }
  })

  if (!existingChapter) {
    throw createError({
      statusCode: 404,
      message: '章节不存在'
    })
  }

  const body = await readBody(event)
  const result = authorChapterSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { title, content, order, status, scheduledAt } = result.data
  const wordCount = content.replace(/\s/g, '').length

  const updateData: any = {
    title,
    content,
    wordCount
  }

  let warning: string | null = null

  if (order !== undefined) {
    updateData.order = order
  }

  if (status) {
    updateData.status = status
    if (status === 'SCHEDULED' && scheduledAt) {
      updateData.scheduledAt = new Date(scheduledAt)
    } else if (status === 'PUBLISHED') {
      if (!existingChapter.publishedAt) {
        updateData.publishedAt = new Date()
      }
      updateData.scheduledAt = null
    } else {
      updateData.scheduledAt = null
    }
  }

  const contentChanged = title !== existingChapter.title || content !== existingChapter.content
  const isPublishing = status === 'PUBLISHED' && existingChapter.status !== 'PUBLISHED'

  if (contentChanged || isPublishing) {
    const targetStatus = status || existingChapter.status
    if (targetStatus === 'PUBLISHED') {
      const contentToCheck = `${title} ${content}`
      const sensitiveResult = await checkSensitiveWords(contentToCheck)

      if (sensitiveResult.shouldBlock) {
        const blockedWords = sensitiveResult.matchedWords.filter((w: any) => w.level === 'BLOCK').map((w: any) => w.word)
        throw createError({
          statusCode: 400,
          message: `内容包含违禁敏感词：${blockedWords.join('、')}，无法发布`
        })
      }

      if (sensitiveResult.hasSensitiveWords) {
        updateData.reviewStatus = 'PENDING'
        updateData.submittedAt = new Date()
        warning = `内容包含敏感词：${sensitiveResult.matchedWords.map((w: any) => w.word).join('、')}，已自动进入人工审核`
      } else {
        updateData.reviewStatus = 'APPROVED'
        updateData.submittedAt = existingChapter.submittedAt || new Date()
      }

      if (!existingChapter.publishedAt) {
        recordChapterPublished(user.userId, novelId, chapterId, novel.title, title)
      }
    }
  }

  const chapter = await prisma.chapter.update({
    where: { id: chapterId, novelId },
    data: updateData
  })

  return { success: true, chapter, warning }
})
