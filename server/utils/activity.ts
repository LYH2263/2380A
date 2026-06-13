import prisma from '~/server/utils/prisma'

export async function recordNovelPublished(userId: number, novelId: number, novelTitle: string) {
  await prisma.activity.create({
    data: {
      userId,
      type: 'NOVEL_PUBLISHED',
      novelId,
      metadata: JSON.stringify({ novelTitle })
    }
  })
}

export async function recordChapterPublished(userId: number, novelId: number, chapterId: number, novelTitle: string, chapterTitle: string) {
  await prisma.activity.create({
    data: {
      userId,
      type: 'CHAPTER_PUBLISHED',
      novelId,
      chapterId,
      metadata: JSON.stringify({ novelTitle, chapterTitle })
    }
  })
}

export async function recordCommentPosted(userId: number, novelId: number, chapterId: number, commentId: number, novelTitle: string, chapterTitle: string) {
  await prisma.activity.create({
    data: {
      userId,
      type: 'COMMENT_POSTED',
      novelId,
      chapterId,
      commentId,
      metadata: JSON.stringify({ novelTitle, chapterTitle })
    }
  })
}

export async function recordRatingSubmitted(userId: number, novelId: number, ratingId: number, novelTitle: string, score: number) {
  await prisma.activity.create({
    data: {
      userId,
      type: 'RATING_SUBMITTED',
      novelId,
      ratingId,
      metadata: JSON.stringify({ novelTitle, score })
    }
  })
}
