-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "NovelStatus" AS ENUM ('ONGOING', 'COMPLETED', 'HIATUS');

-- CreateEnum
CREATE TYPE "ChapterStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "ReviewContentType" AS ENUM ('NOVEL', 'CHAPTER', 'COMMENT');

-- CreateEnum
CREATE TYPE "ReviewActionType" AS ENUM ('APPROVE', 'REJECT', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "SensitiveWordLevel" AS ENUM ('WARN', 'BLOCK');

-- CreateEnum
CREATE TYPE "ReadingStatus" AS ENUM ('UNREAD', 'READING', 'FINISHED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('NOVEL_PUBLISHED', 'CHAPTER_PUBLISHED', 'COMMENT_POSTED', 'RATING_SUBMITTED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('SPAM', 'HARASSMENT', 'HATE_SPEECH', 'EXPLICIT_CONTENT', 'OTHER');

-- CreateEnum
CREATE TYPE "RankingPeriod" AS ENUM ('WEEK', 'MONTH', 'ALL');

-- CreateEnum
CREATE TYPE "RankingType" AS ENUM ('POPULARITY', 'RATING', 'FAVORITE', 'NEW_BOOK', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('USER_DATA_EXPORT', 'ADMIN_NOVEL_EXPORT', 'ADMIN_USER_EXPORT', 'ADMIN_COMMENT_EXPORT', 'ADMIN_NOVEL_IMPORT', 'NOVEL_BACKUP', 'NOVEL_RESTORE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShareType" AS ENUM ('BOOKSHELF', 'BOOKLIST');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('PERSONALIZED', 'SIMILAR_USERS', 'SIMILAR_TAGS', 'COLD_START');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('DISLIKE', 'NOT_INTERESTED');

-- CreateEnum
CREATE TYPE "RecommendationCacheType" AS ENUM ('PERSONALIZED_FOR_YOU', 'SIMILAR_NOVEL_USERS', 'SIMILAR_NOVEL_TAGS');

-- CreateEnum
CREATE TYPE "AnnouncementPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AnnouncementTarget" AS ENUM ('ALL', 'USER', 'AUTHOR');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CONTEST', 'VOTING', 'COLLECTION', 'PROMOTION');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'UPCOMING', 'ONGOING', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatar" TEXT,
    "bio" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bookshelfViewMode" TEXT NOT NULL DEFAULT 'grid',
    "bookshelfSortBy" TEXT NOT NULL DEFAULT 'lastReadAt',
    "bookshelfSortOrder" TEXT NOT NULL DEFAULT 'desc',
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "novels" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cover" TEXT,
    "authorId" INTEGER NOT NULL,
    "status" "NovelStatus" NOT NULL DEFAULT 'ONGOING',
    "tags" TEXT[],
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "novels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" SERIAL NOT NULL,
    "novelId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ChapterStatus" NOT NULL DEFAULT 'PUBLISHED',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "finishCount" INTEGER NOT NULL DEFAULT 0,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "chapterId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "paragraph" INTEGER,
    "parentId" INTEGER,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "novelId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readingStatus" "ReadingStatus" NOT NULL DEFAULT 'UNREAD',
    "lastReadAt" TIMESTAMP(3),
    "lastChapterId" INTEGER,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastViewedUpdateAt" TIMESTAMP(3),
    "hasNewUpdate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_lists" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_list_items" (
    "id" SERIAL NOT NULL,
    "bookListId" INTEGER NOT NULL,
    "favoriteId" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "likes" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "novelId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "novelId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "read_history" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "novelId" INTEGER NOT NULL,
    "lastChapterId" INTEGER,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "read_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" SERIAL NOT NULL,
    "followerId" INTEGER NOT NULL,
    "followingId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "ActivityType" NOT NULL,
    "novelId" INTEGER,
    "chapterId" INTEGER,
    "commentId" INTEGER,
    "ratingId" INTEGER,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_likes" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "commentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_reports" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "commentId" INTEGER NOT NULL,
    "type" "ReportType" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comment_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_mentions" (
    "id" SERIAL NOT NULL,
    "commentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "novel_period_stats" (
    "id" SERIAL NOT NULL,
    "novelId" INTEGER NOT NULL,
    "period" "RankingPeriod" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "favoriteCount" INTEGER NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "ratingSum" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "novel_period_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranking_snapshots" (
    "id" SERIAL NOT NULL,
    "rankingType" "RankingType" NOT NULL,
    "period" "RankingPeriod" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "novelId" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranking_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranking_caches" (
    "id" SERIAL NOT NULL,
    "rankingType" "RankingType" NOT NULL,
    "period" "RankingPeriod" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ranking_caches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "novel_daily_stats" (
    "id" SERIAL NOT NULL,
    "novelId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "favoriteCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "chapterViewCount" INTEGER NOT NULL DEFAULT 0,
    "chapterReadCount" INTEGER NOT NULL DEFAULT 0,
    "chapterFinishCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "novel_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_export_tasks" (
    "id" SERIAL NOT NULL,
    "type" "TaskType" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "userId" INTEGER,
    "adminId" INTEGER,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "fileName" TEXT,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "downloadUrl" TEXT,
    "filters" TEXT,
    "fields" TEXT,
    "result" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "import_export_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "type" "ShareType" NOT NULL,
    "userId" INTEGER NOT NULL,
    "bookListId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "data" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "novel_backups" (
    "id" SERIAL NOT NULL,
    "novelId" INTEGER NOT NULL,
    "adminId" INTEGER,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "novelTitle" TEXT NOT NULL,
    "chapterCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "checksum" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "novel_backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tag_preferences" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tag" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tag_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_feedbacks" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "novelId" INTEGER NOT NULL,
    "type" "FeedbackType" NOT NULL DEFAULT 'NOT_INTERESTED',
    "recommendationType" "RecommendationType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_caches" (
    "id" SERIAL NOT NULL,
    "cacheType" "RecommendationCacheType" NOT NULL,
    "targetId" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "recommendation_caches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preference_caches" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tagWeights" TEXT NOT NULL,
    "authorWeights" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preference_caches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_records" (
    "id" SERIAL NOT NULL,
    "contentType" "ReviewContentType" NOT NULL,
    "novelId" INTEGER,
    "chapterId" INTEGER,
    "commentId" INTEGER,
    "reviewerId" INTEGER,
    "action" "ReviewActionType" NOT NULL,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensitive_words" (
    "id" SERIAL NOT NULL,
    "word" TEXT NOT NULL,
    "level" "SensitiveWordLevel" NOT NULL DEFAULT 'WARN',
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sensitive_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" "AnnouncementPriority" NOT NULL DEFAULT 'MEDIUM',
    "target" "AnnouncementTarget" NOT NULL DEFAULT 'ALL',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_dismisses" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "announcementId" INTEGER NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_dismisses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rules" TEXT NOT NULL,
    "coverImage" TEXT,
    "type" "EventType" NOT NULL DEFAULT 'CONTEST',
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "registrationStartAt" TIMESTAMP(3) NOT NULL,
    "registrationEndAt" TIMESTAMP(3) NOT NULL,
    "eventStartAt" TIMESTAMP(3) NOT NULL,
    "eventEndAt" TIMESTAMP(3) NOT NULL,
    "minWordCount" INTEGER,
    "maxWordCount" INTEGER,
    "allowedTags" TEXT[],
    "requireNew" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_participations" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "novelId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "ParticipationStatus" NOT NULL DEFAULT 'PENDING',
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "rejectionReason" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "event_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_daily_stats" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "participationId" INTEGER,
    "date" DATE NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "chapterViewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_votes" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "participationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_novelId_order_key" ON "chapters"("novelId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_novelId_key" ON "favorites"("userId", "novelId");

-- CreateIndex
CREATE INDEX "book_lists_userId_sortOrder_idx" ON "book_lists"("userId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "book_lists_userId_name_key" ON "book_lists"("userId", "name");

-- CreateIndex
CREATE INDEX "book_list_items_bookListId_addedAt_idx" ON "book_list_items"("bookListId", "addedAt");

-- CreateIndex
CREATE UNIQUE INDEX "book_list_items_bookListId_favoriteId_key" ON "book_list_items"("bookListId", "favoriteId");

-- CreateIndex
CREATE UNIQUE INDEX "likes_userId_novelId_key" ON "likes"("userId", "novelId");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_userId_novelId_key" ON "ratings"("userId", "novelId");

-- CreateIndex
CREATE UNIQUE INDEX "read_history_userId_novelId_key" ON "read_history"("userId", "novelId");

-- CreateIndex
CREATE UNIQUE INDEX "follows_followerId_followingId_key" ON "follows"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "activities_userId_createdAt_idx" ON "activities"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "comment_likes_userId_commentId_key" ON "comment_likes"("userId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "comment_mentions_commentId_userId_key" ON "comment_mentions"("commentId", "userId");

-- CreateIndex
CREATE INDEX "novel_period_stats_period_periodKey_idx" ON "novel_period_stats"("period", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "novel_period_stats_novelId_period_periodKey_key" ON "novel_period_stats"("novelId", "period", "periodKey");

-- CreateIndex
CREATE INDEX "ranking_snapshots_rankingType_period_periodKey_rank_idx" ON "ranking_snapshots"("rankingType", "period", "periodKey", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "ranking_snapshots_rankingType_period_periodKey_novelId_key" ON "ranking_snapshots"("rankingType", "period", "periodKey", "novelId");

-- CreateIndex
CREATE UNIQUE INDEX "ranking_caches_rankingType_period_periodKey_key" ON "ranking_caches"("rankingType", "period", "periodKey");

-- CreateIndex
CREATE INDEX "novel_daily_stats_novelId_date_idx" ON "novel_daily_stats"("novelId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "novel_daily_stats_novelId_date_key" ON "novel_daily_stats"("novelId", "date");

-- CreateIndex
CREATE INDEX "import_export_tasks_userId_createdAt_idx" ON "import_export_tasks"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "import_export_tasks_adminId_createdAt_idx" ON "import_export_tasks"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "import_export_tasks_status_createdAt_idx" ON "import_export_tasks"("status", "createdAt");

-- CreateIndex
CREATE INDEX "import_export_tasks_type_createdAt_idx" ON "import_export_tasks"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_key" ON "share_links"("token");

-- CreateIndex
CREATE INDEX "share_links_userId_createdAt_idx" ON "share_links"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "share_links_token_idx" ON "share_links"("token");

-- CreateIndex
CREATE INDEX "novel_backups_novelId_createdAt_idx" ON "novel_backups"("novelId", "createdAt");

-- CreateIndex
CREATE INDEX "novel_backups_adminId_createdAt_idx" ON "novel_backups"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "user_tag_preferences_userId_idx" ON "user_tag_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_tag_preferences_userId_tag_key" ON "user_tag_preferences"("userId", "tag");

-- CreateIndex
CREATE INDEX "recommendation_feedbacks_userId_idx" ON "recommendation_feedbacks"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_feedbacks_userId_novelId_type_key" ON "recommendation_feedbacks"("userId", "novelId", "type");

-- CreateIndex
CREATE INDEX "recommendation_caches_cacheType_idx" ON "recommendation_caches"("cacheType");

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_caches_cacheType_targetId_key" ON "recommendation_caches"("cacheType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "user_preference_caches_userId_key" ON "user_preference_caches"("userId");

-- CreateIndex
CREATE INDEX "review_records_contentType_createdAt_idx" ON "review_records"("contentType", "createdAt");

-- CreateIndex
CREATE INDEX "review_records_novelId_createdAt_idx" ON "review_records"("novelId", "createdAt");

-- CreateIndex
CREATE INDEX "review_records_chapterId_createdAt_idx" ON "review_records"("chapterId", "createdAt");

-- CreateIndex
CREATE INDEX "review_records_commentId_createdAt_idx" ON "review_records"("commentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "sensitive_words_word_key" ON "sensitive_words"("word");

-- CreateIndex
CREATE INDEX "sensitive_words_word_idx" ON "sensitive_words"("word");

-- CreateIndex
CREATE INDEX "sensitive_words_level_idx" ON "sensitive_words"("level");

-- CreateIndex
CREATE INDEX "announcements_isActive_priority_sortOrder_idx" ON "announcements"("isActive", "priority", "sortOrder");

-- CreateIndex
CREATE INDEX "announcements_startAt_endAt_idx" ON "announcements"("startAt", "endAt");

-- CreateIndex
CREATE INDEX "announcement_dismisses_userId_idx" ON "announcement_dismisses"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "announcement_dismisses_userId_announcementId_key" ON "announcement_dismisses"("userId", "announcementId");

-- CreateIndex
CREATE INDEX "events_status_sortOrder_idx" ON "events"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "events_eventStartAt_eventEndAt_idx" ON "events"("eventStartAt", "eventEndAt");

-- CreateIndex
CREATE INDEX "event_participations_eventId_status_idx" ON "event_participations"("eventId", "status");

-- CreateIndex
CREATE INDEX "event_participations_userId_idx" ON "event_participations"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "event_participations_eventId_novelId_key" ON "event_participations"("eventId", "novelId");

-- CreateIndex
CREATE INDEX "event_daily_stats_eventId_date_idx" ON "event_daily_stats"("eventId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "event_daily_stats_eventId_participationId_date_key" ON "event_daily_stats"("eventId", "participationId", "date");

-- CreateIndex
CREATE INDEX "event_votes_eventId_userId_idx" ON "event_votes"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "event_votes_eventId_participationId_userId_key" ON "event_votes"("eventId", "participationId", "userId");

-- CreateIndex
CREATE INDEX "banners_isActive_sortOrder_idx" ON "banners"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "banners_startAt_endAt_idx" ON "banners"("startAt", "endAt");

-- AddForeignKey
ALTER TABLE "novels" ADD CONSTRAINT "novels_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "novels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "novels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_lists" ADD CONSTRAINT "book_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_list_items" ADD CONSTRAINT "book_list_items_bookListId_fkey" FOREIGN KEY ("bookListId") REFERENCES "book_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_list_items" ADD CONSTRAINT "book_list_items_favoriteId_fkey" FOREIGN KEY ("favoriteId") REFERENCES "favorites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "novels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "novels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "read_history" ADD CONSTRAINT "read_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "read_history" ADD CONSTRAINT "read_history_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "novels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "novels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_ratingId_fkey" FOREIGN KEY ("ratingId") REFERENCES "ratings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novel_period_stats" ADD CONSTRAINT "novel_period_stats_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "novels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranking_snapshots" ADD CONSTRAINT "ranking_snapshots_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "novels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novel_daily_stats" ADD CONSTRAINT "novel_daily_stats_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "novels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_export_tasks" ADD CONSTRAINT "import_export_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_export_tasks" ADD CONSTRAINT "import_export_tasks_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_bookListId_fkey" FOREIGN KEY ("bookListId") REFERENCES "book_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novel_backups" ADD CONSTRAINT "novel_backups_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novel_backups" ADD CONSTRAINT "novel_backups_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "novels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tag_preferences" ADD CONSTRAINT "user_tag_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_feedbacks" ADD CONSTRAINT "recommendation_feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_feedbacks" ADD CONSTRAINT "recommendation_feedbacks_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "novels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_records" ADD CONSTRAINT "review_records_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_records" ADD CONSTRAINT "review_records_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "novels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_records" ADD CONSTRAINT "review_records_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_records" ADD CONSTRAINT "review_records_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_dismisses" ADD CONSTRAINT "announcement_dismisses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_dismisses" ADD CONSTRAINT "announcement_dismisses_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participations" ADD CONSTRAINT "event_participations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participations" ADD CONSTRAINT "event_participations_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "novels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participations" ADD CONSTRAINT "event_participations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_daily_stats" ADD CONSTRAINT "event_daily_stats_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_daily_stats" ADD CONSTRAINT "event_daily_stats_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "event_participations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_votes" ADD CONSTRAINT "event_votes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_votes" ADD CONSTRAINT "event_votes_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "event_participations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_votes" ADD CONSTRAINT "event_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

