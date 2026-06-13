<template>
  <div class="min-h-screen">
    <div v-if="pending" class="container mx-auto px-4 py-8">
      <div class="animate-pulse space-y-4">
        <div class="h-8 bg-white/10 rounded w-1/3" />
        <div class="h-4 bg-white/10 rounded w-full" />
        <div class="h-4 bg-white/10 rounded w-full" />
        <div class="h-4 bg-white/10 rounded w-2/3" />
      </div>
    </div>

    <div v-else-if="chapter" :class="[pageWidthMap[settings.pageWidth], 'mx-auto', themeStyles.text]">
      <div class="sticky top-16 z-40 glass border-b border-white/10 px-4 py-3">
        <div class="flex items-center justify-between">
          <NuxtLink
            :to="`/novels/${novelId}`"
            class="flex items-center gap-2 hover:opacity-80 transition"
            :class="isNightMode ? 'text-white/70 hover:text-white' : ''"
          >
            <Icon name="ph:caret-left" />
            <span class="hidden md:inline">{{ chapter.novel?.title }}</span>
          </NuxtLink>

          <h1 class="font-bold truncate max-w-md">
            {{ chapter.title }}
          </h1>

          <div class="flex items-center gap-2">
            <button
              @click="showToc = true"
              class="p-2 rounded-lg hover:bg-white/10 transition"
              title="章节目录"
            >
              <Icon name="ph:list-numbers" />
            </button>
            <button
              @click="showSettings = true"
              class="p-2 rounded-lg hover:bg-white/10 transition"
              title="阅读设置"
            >
              <Icon name="ph:sliders-horizontal" />
            </button>
          </div>
        </div>
      </div>

      <article 
        ref="contentRef"
        class="px-4 md:px-8 py-8 pb-20"
        :style="contentStyle"
      >
        <div class="prose-novel" :style="contentStyle">
          <div
            v-for="(para, index) in paragraphs"
            :key="index"
            :ref="el => { if (el) paragraphRefs[index] = el as HTMLElement }"
            class="relative group"
            :data-paragraph-index="index"
          >
            <p 
              class="mb-4 indent-8 hover:bg-white/5 rounded transition cursor-pointer"
               @click="toggleParagraphComment(index)"
            >
              {{ para }}
            </p>
            
            <button
              v-if="paragraphComments[index]?.length"
              @click.stop="toggleParagraphComment(index)"
              class="absolute -right-8 top-0 text-neuro-primary hover:scale-110 transition"
            >
              <Icon name="ph:chat-circle-dots-fill" />
              <span class="text-xs">{{ paragraphComments[index].length }}</span>
            </button>

            <Transition
              enter-active-class="transition duration-200"
              enter-from-class="opacity-0 scale-95"
              enter-to-class="opacity-100 scale-100"
              leave-active-class="transition duration-150"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div
                v-if="activeParagraph === index"
                class="mt-2 mb-4 p-4 glass rounded-xl"
              >
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-bold text-sm">段落评论</h4>
                  <button @click="activeParagraph = null" class="opacity-70 hover:opacity-100">
                    <Icon name="ph:x" />
                  </button>
                </div>

                <div v-if="paragraphComments[index]?.length" class="space-y-2 mb-4 max-h-64 overflow-y-auto">
                  <CommentItem
                    v-for="comment in paragraphComments[index]"
                    :key="comment.id"
                    :comment="comment"
                    :chapter-id="chapterId"
                    @refresh="refreshAll"
                  />
                </div>

                <div v-if="user" class="flex gap-2">
                  <input
                    v-model="newComment"
                    type="text"
                    placeholder="写下你的评论..."
                    class="input-field text-sm py-2"
                    @keyup.enter="submitComment(index)"
                  />
                  <Button
                    @click="submitComment(index)"
                    :loading="commentLoading"
                    variant="primary"
                    size="sm"
                  >
                    发送
                  </Button>
                </div>
                <p v-else class="text-sm opacity-50">
                  <NuxtLink to="/auth/login" class="text-neuro-primary hover:underline">登录</NuxtLink>
                  后可以发表评论
                </p>
              </div>
            </Transition>
          </div>
        </div>
      </article>

      <div class="sticky bottom-0 glass border-t border-white/10 px-4 py-4">
        <div class="flex items-center justify-between">
          <NuxtLink
            v-if="chapter.prevChapter"
            :to="`/novels/${novelId}/chapters/${chapter.prevChapter.id}`"
            class="btn-secondary"
          >
            <Icon name="ph:caret-left" class="mr-1" />
            上一章
          </NuxtLink>
          <div v-else />

          <NuxtLink
            :to="`/novels/${novelId}`"
            class="btn-secondary"
          >
            <Icon name="ph:list" class="mr-1" />
            目录
          </NuxtLink>

          <NuxtLink
            v-if="chapter.nextChapter"
            :to="`/novels/${novelId}/chapters/${chapter.nextChapter.id}`"
            class="btn-secondary"
          >
            下一章
            <Icon name="ph:caret-right" class="ml-1" />
          </NuxtLink>
          <div v-else />
        </div>
      </div>

      <div class="px-4 py-8">
        <div class="card p-6">
          <div class="flex items-center justify-between mb-4 flex-wrap gap-4">
            <h3 class="text-xl font-bold flex items-center gap-2">
              <Icon name="ph:chat-circle-text" />
              章节评论
              <span v-if="pagination" class="text-sm font-normal opacity-60">
                ({{ pagination.total }} 条)
              </span>
            </h3>

            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1 text-sm">
                <button
                  v-for="option in sortOptions"
                  :key="option.value"
                  @click="sortBy = option.value as any"
                  :class="[
                    'px-3 py-1.5 rounded-lg transition',
                    sortBy === option.value
                      ? 'bg-neuro-primary/20 text-neuro-primary'
                      : 'opacity-60 hover:opacity-100 hover:bg-white/10'
                  ]"
                >
                  {{ option.label }}
                </button>
              </div>

              <div class="flex items-center gap-1 text-sm border-l border-white/10 pl-3">
                <button
                  @click="loadMode = 'scroll'"
                  :class="[
                    'px-2 py-1.5 rounded-lg transition',
                    loadMode === 'scroll'
                      ? 'bg-neuro-primary/20 text-neuro-primary'
                      : 'opacity-60 hover:opacity-100 hover:bg-white/10'
                  ]"
                  title="无限滚动"
                >
                  <Icon name="ph:list-dashes" />
                </button>
                <button
                  @click="loadMode = 'pagination'"
                  :class="[
                    'px-2 py-1.5 rounded-lg transition',
                    loadMode === 'pagination'
                      ? 'bg-neuro-primary/20 text-neuro-primary'
                      : 'opacity-60 hover:opacity-100 hover:bg-white/10'
                  ]"
                  title="分页器"
                >
                  <Icon name="ph:squares-four" />
                </button>
              </div>
            </div>
          </div>

          <div v-if="user" class="mb-6">
            <FormTextarea
              v-model="chapterComment"
              placeholder="分享你对这一章的看法... 可以 @用户名 来提及其他用户"
              :rows="3"
            />
            <Button
              @click="submitChapterComment"
              :loading="chapterCommentLoading"
              variant="primary"
              class="mt-2"
            >
              发表评论
            </Button>
          </div>
          <div v-else class="mb-6 p-4 glass rounded-xl text-center">
            <NuxtLink to="/auth/login" class="text-neuro-primary hover:underline">登录</NuxtLink>
            后可以发表评论
          </div>

          <div v-if="displayedComments?.length" class="space-y-4">
            <CommentItem
              v-for="comment in displayedComments"
              :key="comment.id"
              :comment="comment"
              :chapter-id="chapterId"
              @refresh="refreshAll"
            />
          </div>

          <div v-else-if="!commentsPending" class="text-center py-8 opacity-50">
            暂无评论，来发表第一条评论吧！
          </div>

          <div v-if="loadMode === 'scroll' && hasMore" class="mt-6 text-center">
            <Button
              @click="loadMore"
              :loading="commentsPending"
              variant="secondary"
            >
              加载更多
            </Button>
          </div>

          <div
            v-if="loadMode === 'pagination' && pagination && pagination.totalPages > 1"
            class="mt-6 flex items-center justify-center gap-2"
          >
            <button
              @click="goToPage(pagination.page - 1)"
              :disabled="pagination.page <= 1 || commentsPending"
              class="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <div class="flex items-center gap-1">
              <button
                v-for="page in pagination.totalPages"
                :key="page"
                @click="goToPage(page)"
                :class="[
                  'w-10 h-10 rounded-lg transition text-sm font-medium',
                  pagination.page === page
                    ? 'bg-neuro-primary text-white'
                    : 'bg-white/10 hover:bg-white/20'
                ]"
                :disabled="commentsPending"
              >
                {{ page }}
              </button>
            </div>
            <button
              @click="goToPage(pagination.page + 1)"
              :disabled="pagination.page >= pagination.totalPages || commentsPending"
              class="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="container mx-auto px-4 py-20 text-center">
      <Icon name="ph:warning" class="text-6xl opacity-30 mb-4" />
      <p class="text-xl opacity-50">章节不存在</p>
      <NuxtLink to="/novels" class="btn-primary mt-4 inline-block">
        返回小说库
      </NuxtLink>
    </div>

    <ReadingSettingsPanel :visible="showSettings" @close="showSettings = false" />

    <AutoScrollControl :scroll-container="null" @scroll-end="handleScrollEnd" />

    <ReadingProgressBar :scroll-container="null" />

    <ChapterToc
      :visible="showToc"
      :paragraphs="paragraphs"
      :paragraph-refs="paragraphRefs"
      @close="showToc = false"
    />

    <Transition
      enter-active-class="transition duration-300"
      enter-from-class="opacity-0 translate-y-full"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-full"
    >
      <div
        v-if="showNextChapterPrompt"
        class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 glass rounded-2xl px-6 py-4 shadow-2xl border border-white/20"
      >
        <p class="text-sm mb-3 text-center">已滚动到底部，是否前往下一章？</p>
        <div class="flex gap-3">
          <button
            @click="showNextChapterPrompt = false"
            class="px-4 py-2 rounded-lg glass hover:bg-white/10 transition text-sm"
          >
            继续阅读
          </button>
          <NuxtLink
            v-if="chapter?.nextChapter"
            :to="`/novels/${novelId}/chapters/${chapter.nextChapter.id}`"
            class="px-4 py-2 rounded-lg bg-gradient-to-r from-neuro-primary to-neuro-secondary text-white text-sm font-medium"
          >
            下一章
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { user } = useAuth()
const toast = useToast()

const { settings, fontFamilyMap, pageWidthMap, themeStyles, isNightMode, applyThemeToBody } = useReadingSettings()
const { renderContentWithMentions } = useCommentUtils()

const novelId = computed(() => Number(route.params.id))
const chapterId = computed(() => Number(route.params.chapterId))

const { data: chapter, pending, refresh: refreshChapter } = await useFetch(
  () => `/api/novels/${novelId.value}/chapters/${chapterId.value}`
)

const updateReadingProgress = async () => {
  if (!user.value) return
  
  try {
    await $fetch('/api/user/bookshelf/progress', {
      method: 'POST',
      body: {
        novelId: novelId.value,
        chapterId: chapterId.value,
        progress: 0
      }
    })
  } catch (e: any) {
    // 静默失败，可能是用户未收藏该小说
  }
}

const clearUpdateNotification = async () => {
  if (!user.value) return
  
  try {
    await $fetch(`/api/user/bookshelf/${novelId.value}/clear-update`, {
      method: 'POST'
    })
  } catch (e: any) {
    // 静默失败
  }
}

const showSettings = ref(false)
const showToc = ref(false)
const showNextChapterPrompt = ref(false)
const contentRef = ref<HTMLElement | null>(null)
const paragraphRefs = ref<HTMLElement[]>([])

const sortBy = ref<'newest' | 'oldest' | 'hot'>('newest')
const loadMode = ref<'scroll' | 'pagination'>('scroll')
const currentPage = ref(1)
const allComments = ref<any[]>([])

const sortOptions = [
  { value: 'newest', label: '最新' },
  { value: 'oldest', label: '最早' },
  { value: 'hot', label: '热度' }
]

const { data: commentsData, refresh: refreshComments, pending: commentsPending } = await useFetch(
  () => `/api/chapters/${chapterId.value}/comments`,
  {
    query: computed(() => ({
      sort: sortBy.value,
      page: currentPage.value,
      limit: 20
    }))
  }
)

const chapterComments = computed(() => commentsData.value?.comments || [])
const pagination = computed(() => commentsData.value?.pagination)
const hasMore = computed(() => pagination.value && currentPage.value < pagination.value.totalPages)

watchEffect(() => {
  if (loadMode.value === 'scroll' && commentsData.value?.comments) {
    if (currentPage.value === 1) {
      allComments.value = [...commentsData.value.comments]
    } else {
      const existingIds = new Set(allComments.value.map(c => c.id))
      const newComments = commentsData.value.comments.filter(
        (c: any) => !existingIds.has(c.id)
      )
      allComments.value = [...allComments.value, ...newComments]
    }
  }
})

watch(() => sortBy.value, () => {
  currentPage.value = 1
  allComments.value = []
  refreshComments()
})

watch(() => route.params.chapterId, () => {
  showNextChapterPrompt.value = false
  paragraphRefs.value = []
  currentPage.value = 1
  allComments.value = []
  sortBy.value = 'newest'
  updateReadingProgress()
  clearUpdateNotification()
})

watch(() => chapter.value, (newChapter) => {
  if (newChapter) {
    updateReadingProgress()
    clearUpdateNotification()
  }
}, { immediate: true })

const displayedComments = computed(() => {
  if (loadMode.value === 'scroll') {
    return allComments.value
  }
  return chapterComments.value
})

const contentStyle = computed(() => {
  return {
    fontSize: settings.value.fontSize + 'px',
    fontFamily: fontFamilyMap.value[settings.value.fontFamily],
    lineHeight: settings.value.lineHeight.toString()
  }
})

const activeParagraph = ref<number | null>(null)
const newComment = ref('')
const chapterComment = ref('')
const commentLoading = ref(false)
const chapterCommentLoading = ref(false)

const paragraphs = computed(() => {
  if (!chapter.value?.content) return []
  return chapter.value.content
    .split('\n')
    .map((p: string) => p.trim())
    .filter((p: string) => p.length > 0)
})

const paragraphComments = computed(() => {
  if (!chapter.value?.comments) return {}
  const grouped: Record<number, any[]> = {}
  chapter.value.comments.forEach((comment: any) => {
    if (comment.paragraph !== null) {
      if (!grouped[comment.paragraph]) {
        grouped[comment.paragraph] = []
      }
      grouped[comment.paragraph].push(comment)
    }
  })
  return grouped
})

const toggleParagraphComment = (index: number) => {
  activeParagraph.value = activeParagraph.value === index ? null : index
}

const refreshAll = async () => {
  await Promise.all([refreshChapter(), refreshComments()])
  if (loadMode.value === 'scroll') {
    currentPage.value = 1
    allComments.value = []
    await refreshComments()
  }
}

const loadMore = async () => {
  if (!hasMore.value || commentsPending.value) return
  currentPage.value++
  await refreshComments()
}

const goToPage = (page: number) => {
  currentPage.value = page
  refreshComments()
}

const submitComment = async (paragraphIndex: number) => {
  if (!newComment.value.trim()) return
  
  commentLoading.value = true
  try {
    await $fetch(`/api/chapters/${chapterId.value}/comments`, {
      method: 'POST',
      body: {
        content: newComment.value,
        paragraph: paragraphIndex
      }
    })
    newComment.value = ''
    await refreshAll()
    toast.success('评论成功')
  } catch (e: any) {
    toast.error(e.message || '评论失败')
  } finally {
    commentLoading.value = false
  }
}

const submitChapterComment = async () => {
  if (!chapterComment.value.trim()) return
  
  chapterCommentLoading.value = true
  try {
    await $fetch(`/api/chapters/${chapterId.value}/comments`, {
      method: 'POST',
      body: {
        content: chapterComment.value
      }
    })
    chapterComment.value = ''
    await refreshAll()
    toast.success('评论成功')
  } catch (e: any) {
    toast.error(e.message || '评论失败')
  } finally {
    chapterCommentLoading.value = false
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleScrollEnd = () => {
  showNextChapterPrompt.value = true
}

onMounted(() => {
  applyThemeToBody()
})

useHead({
  title: computed(() => chapter.value ? `${chapter.value.title} - ${chapter.value.novel?.title}` : '加载中...')
})
</script>

<style scoped>
.prose-novel {
  @apply leading-relaxed;
}

.prose-novel p {
  @apply mb-4 indent-8;
}
</style>
