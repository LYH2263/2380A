import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少6位')
})

export const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  username: z.string().min(2, '用户名至少2个字符').max(20, '用户名最多20个字符'),
  password: z.string().min(6, '密码至少6位')
})

export const novelSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题最多100字'),
  description: z.string().min(10, '简介至少10个字符'),
  cover: z.string().url().optional().or(z.literal('')),
  status: z.enum(['ONGOING', 'COMPLETED', 'HIATUS']).optional(),
  tags: z.array(z.string()).optional()
})

export const chapterSchema = z.object({
  title: z.string().min(1, '章节标题不能为空'),
  content: z.string().min(10, '章节内容至少10个字符'),
  order: z.number().int().positive().optional()
})

export const commentSchema = z.object({
  content: z.string().min(1, '评论不能为空').max(1000, '评论最多1000字'),
  paragraph: z.number().int().nonnegative().optional(),
  parentId: z.number().int().positive().optional()
})

export const ratingSchema = z.object({
  score: z.number().int().min(1, '评分最少1分').max(5, '评分最多5分')
})

export const commentEditSchema = z.object({
  content: z.string().min(1, '评论不能为空').max(1000, '评论最多1000字')
})

export const commentReportSchema = z.object({
  type: z.enum(['SPAM', 'HARASSMENT', 'HATE_SPEECH', 'EXPLICIT_CONTENT', 'OTHER']),
  reason: z.string().min(1, '请填写举报理由').max(500, '举报理由最多500字')
})

export const commentQuerySchema = z.object({
  sort: z.enum(['newest', 'oldest', 'hot']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  paragraph: z.coerce.number().int().nonnegative().optional()
})

export const authorChapterSchema = z.object({
  title: z.string().min(1, '章节标题不能为空'),
  content: z.string().min(10, '章节内容至少10个字符'),
  order: z.number().int().positive().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED']).optional(),
  scheduledAt: z.string().datetime().optional()
})

export const authorNovelSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题最多100字'),
  description: z.string().min(10, '简介至少10个字符'),
  cover: z.string().url().optional().or(z.literal('')),
  status: z.enum(['ONGOING', 'COMPLETED', 'HIATUS']).optional(),
  tags: z.array(z.string()).optional()
})

export const commentReplySchema = z.object({
  content: z.string().min(1, '回复内容不能为空').max(1000, '回复最多1000字')
})

export const reviewActionSchema = z.object({
  contentType: z.enum(['NOVEL', 'CHAPTER', 'COMMENT']),
  contentId: z.number().int().positive(),
  action: z.enum(['APPROVE', 'REJECT', 'NEEDS_REVISION']),
  remark: z.string().max(500, '备注最多500字').optional()
})

export const reviewQueueQuerySchema = z.object({
  contentType: z.enum(['NOVEL', 'CHAPTER', 'COMMENT', '']).optional().default(''),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVISION', 'DRAFT', '']).optional().default('PENDING'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20)
})

export const reviewHistoryQuerySchema = z.object({
  contentType: z.enum(['NOVEL', 'CHAPTER', 'COMMENT', '']).optional().default(''),
  contentId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20)
})

export const sensitiveWordSchema = z.object({
  word: z.string().min(1, '敏感词不能为空').max(50, '敏感词最多50字'),
  level: z.enum(['WARN', 'BLOCK']).optional().default('WARN'),
  category: z.string().max(50, '分类最多50字').optional()
})

export const sensitiveWordQuerySchema = z.object({
  keyword: z.string().optional(),
  level: z.enum(['WARN', 'BLOCK', '']).optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20)
})
