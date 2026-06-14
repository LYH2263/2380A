import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { commentSchema } from '~/server/utils/validators'
import { recordCommentPosted } from '~/server/utils/activity'
import { extractMentionsFromContent } from '~/server/utils/commentUtils'
import { checkSensitiveWords } from '~/server/utils/sensitiveWordFilter'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const chapterId = Number(event.context.params?.chapterId)
  const body = await readBody(event)

  if (!chapterId || isNaN(chapterId)) {
    throw createError({
      statusCode: 400,
      message: '无效的章节ID'
    })
  }

  const result = commentSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { content, paragraph, parentId } = result.data

  const sensitiveResult = await checkSensitiveWords(content)
  if (sensitiveResult.shouldBlock) {
    const blockedWords = sensitiveResult.matchedWords.filter((w: any) => w.level === 'BLOCK').map((w: any) => w.word)
    throw createError({
      statusCode: 400,
      message: `评论包含违禁敏感词：${blockedWords.join('、')}，无法提交`
    })
  }

  const reviewStatus = sensitiveResult.hasSensitiveWords ? 'PENDING' : 'APPROVED'

  // 检查章节是否存在
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      novel: {
        select: { id: true, title: true }
      }
    }
  })

  if (!chapter) {
    throw createError({
      statusCode: 404,
      message: '章节不存在'
    })
  }

  // 如果是回复，检查父评论是否存在
  if (parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId }
    })
    if (!parentComment) {
      throw createError({
        statusCode: 404,
        message: '被回复的评论不存在'
      })
    }
  }

  const mentionedUsernames = extractMentionsFromContent(content)
  const mentionedUsers = mentionedUsernames.length > 0
    ? await prisma.user.findMany({
        where: { username: { in: mentionedUsernames } },
        select: { id: true, username: true }
      })
    : []

  const comment = await prisma.comment.create({
    data: {
      userId: user.userId,
      chapterId,
      content,
      paragraph: paragraph ?? null,
      parentId: parentId ?? null,
      reviewStatus,
      mentions: {
        create: mentionedUsers.map(u => ({
          userId: u.id
        }))
      }
    },
    include: {
      user: {
        select: { id: true, username: true, avatar: true }
      }
    }
  })

  if (reviewStatus === 'APPROVED') {
    recordCommentPosted(user.userId, chapter.novel.id, chapterId, comment.id, chapter.novel.title, chapter.title)
  }

  return {
    success: true,
    comment,
    warning: sensitiveResult.hasSensitiveWords
      ? `评论包含敏感词：${sensitiveResult.matchedWords.map((w: any) => w.word).join('、')}，已自动进入人工审核`
      : null
  }
})
