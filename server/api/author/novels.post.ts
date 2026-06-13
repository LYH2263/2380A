import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { authorNovelSchema } from '~/server/utils/validators'
import { recordNovelPublished } from '~/server/utils/activity'
import { checkSensitiveWords } from '~/server/utils/sensitiveWordFilter'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)

  const result = authorNovelSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { title, description, cover, status, tags } = result.data

  const contentToCheck = `${title} ${description} ${tags?.join(' ') || ''}`
  const sensitiveResult = await checkSensitiveWords(contentToCheck)

  if (sensitiveResult.shouldBlock) {
    const blockedWords = sensitiveResult.matchedWords.filter(w => w.level === 'BLOCK').map(w => w.word)
    throw createError({
      statusCode: 400,
      message: `内容包含违禁敏感词：${blockedWords.join('、')}，无法提交`
    })
  }

  const reviewStatus = sensitiveResult.hasSensitiveWords ? 'PENDING' : 'PENDING'

  const novel = await prisma.novel.create({
    data: {
      title,
      description,
      cover: cover || null,
      status: status || 'ONGOING',
      tags: tags || [],
      authorId: user.userId,
      isFeatured: false,
      reviewStatus,
      submittedAt: new Date()
    },
    include: {
      author: {
        select: { id: true, username: true, avatar: true }
      },
      _count: {
        select: { chapters: true, favorites: true }
      }
    }
  })

  if (reviewStatus === 'APPROVED') {
    recordNovelPublished(user.userId, novel.id, novel.title)
  }

  return {
    success: true,
    novel,
    warning: sensitiveResult.hasSensitiveWords
      ? `内容包含敏感词：${sensitiveResult.matchedWords.map(w => w.word).join('、')}，已自动进入人工审核`
      : null
  }
})
