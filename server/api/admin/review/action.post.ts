import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { reviewActionSchema } from '~/server/utils/validators'

const statusMap: Record<string, string> = {
  APPROVE: 'APPROVED',
  REJECT: 'REJECTED',
  NEEDS_REVISION: 'NEEDS_REVISION'
}

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const body = await readBody(event)

  const result = reviewActionSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { contentType, contentId, action, remark } = result.data

  if (action === 'REJECT' && !remark) {
    throw createError({
      statusCode: 400,
      message: '拒绝操作必须填写拒绝理由'
    })
  }

  if (action === 'NEEDS_REVISION' && !remark) {
    throw createError({
      statusCode: 400,
      message: '标记为需修改必须填写修改意见'
    })
  }

  const newStatus = statusMap[action]
  if (!newStatus) {
    throw createError({
      statusCode: 400,
      message: '无效的审核操作'
    })
  }

  const rejectionReason = (action === 'REJECT' || action === 'NEEDS_REVISION') ? remark : null

  try {
    await prisma.$transaction(async (tx: any) => {
      if (contentType === 'NOVEL') {
        const existing = await tx.novel.findUnique({ where: { id: contentId } })
        if (!existing) {
          throw createError({ statusCode: 404, message: '小说不存在' })
        }
        await tx.novel.update({
          where: { id: contentId },
          data: {
            reviewStatus: newStatus,
            rejectionReason
          }
        })
      } else if (contentType === 'CHAPTER') {
        const existing = await tx.chapter.findUnique({ where: { id: contentId } })
        if (!existing) {
          throw createError({ statusCode: 404, message: '章节不存在' })
        }
        await tx.chapter.update({
          where: { id: contentId },
          data: {
            reviewStatus: newStatus,
            rejectionReason
          }
        })
      } else if (contentType === 'COMMENT') {
        const existing = await tx.comment.findUnique({ where: { id: contentId } })
        if (!existing) {
          throw createError({ statusCode: 404, message: '评论不存在' })
        }
        await tx.comment.update({
          where: { id: contentId },
          data: {
            reviewStatus: newStatus,
            rejectionReason
          }
        })
      }

      const reviewRecordData: any = {
        contentType,
        action,
        remark,
        reviewerId: admin.userId
      }

      if (contentType === 'NOVEL') reviewRecordData.novelId = contentId
      if (contentType === 'CHAPTER') reviewRecordData.chapterId = contentId
      if (contentType === 'COMMENT') reviewRecordData.commentId = contentId

      await tx.reviewRecord.create({
        data: reviewRecordData
      })
    })

    return {
      success: true,
      message: `审核${action === 'APPROVE' ? '通过' : action === 'REJECT' ? '拒绝' : '标记为需修改'}成功`
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('[Review Action API Error]', error)
    throw createError({
      statusCode: 500,
      message: error.message || '审核操作失败'
    })
  }
})
