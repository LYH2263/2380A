<template>
  <div class="min-h-screen py-8">
    <div class="container mx-auto px-4">
      <!-- Loading State -->
      <div v-if="pending" class="animate-pulse space-y-8">
        <div class="flex gap-8">
          <div class="w-64 h-96 bg-white/10 rounded-2xl flex-shrink-0" />
          <div class="flex-1 space-y-4">
            <div class="h-10 bg-white/10 rounded w-1/2" />
            <div class="h-4 bg-white/10 rounded w-full" />
            <div class="h-4 bg-white/10 rounded w-3/4" />
          </div>
        </div>
      </div>

      <!-- Content -->
      <div v-else-if="novel" class="space-y-8">
        <!-- Header -->
        <div class="flex flex-col md:flex-row gap-8">
          <!-- Cover -->
          <div class="w-full md:w-64 flex-shrink-0">
            <img
              :src="novel.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400'"
              :alt="novel.title"
              class="w-full aspect-[3/4] object-cover rounded-2xl shadow-2xl"
            />
          </div>

          <!-- Info -->
          <div class="flex-1">
            <div class="flex items-start justify-between gap-4 mb-4">
              <h1 class="text-3xl md:text-4xl font-bold">{{ novel.title }}</h1>
              <span :class="[
                'px-3 py-1 rounded-lg text-sm font-medium flex-shrink-0',
                statusClasses[novel.status]
              ]">
                {{ statusLabels[novel.status] }}
              </span>
            </div>

            <!-- Author -->
            <div class="flex items-center gap-3 mb-4">
              <img
                :src="novel.author?.avatar"
                :alt="novel.author?.username"
                class="w-10 h-10 rounded-full border-2 border-neuro-primary"
              />
              <div>
                <p class="font-medium">{{ novel.author?.username }}</p>
                <p class="text-sm text-white/50">作者</p>
              </div>
            </div>

            <!-- Stats -->
            <div class="flex flex-wrap gap-6 mb-6 text-white/70">
              <div class="flex items-center gap-2">
                <Icon name="ph:eye" class="text-xl" />
                <span>{{ formatNumber(novel.viewCount) }} 阅读</span>
              </div>
              <div class="flex items-center gap-2">
                <Icon name="ph:heart-fill" class="text-xl text-neuro-primary" />
                <span>{{ novel._count?.likes || 0 }} 点赞</span>
              </div>
              <div class="flex items-center gap-2">
                <Icon name="ph:bookmark-simple-fill" class="text-xl text-neuro-secondary" />
                <span>{{ novel._count?.favorites || 0 }} 收藏</span>
              </div>
              <div class="flex items-center gap-2">
                <Icon name="ph:star-fill" class="text-xl text-yellow-400" />
                <span>{{ novel.avgRating || 0 }} 分 ({{ novel._count?.ratings || 0 }} 人评分)</span>
              </div>
            </div>

            <!-- Tags -->
            <div class="flex flex-wrap gap-2 mb-6">
              <NuxtLink
                v-for="tag in novel.tags"
                :key="tag"
                :to="`/novels?tag=${tag}`"
                class="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-sm transition"
              >
                #{{ tag }}
              </NuxtLink>
            </div>

            <!-- Description -->
            <p class="text-white/80 leading-relaxed mb-6">
              {{ novel.description }}
            </p>

            <!-- Actions -->
            <div class="flex flex-wrap gap-4">
              <NuxtLink
                v-if="novel.chapters?.length > 0"
                :to="`/novels/${novel.id}/chapters/${novel.chapters[0].id}`"
                class="btn-primary"
              >
                <Icon name="ph:book-open" class="mr-2" />
                开始阅读
              </NuxtLink>

              <button
                @click="handleLike"
                :disabled="!user || likeLoading"
                :class="[
                  'btn-secondary flex items-center gap-2',
                  novel.isLiked && 'bg-neuro-primary/20 border-neuro-primary'
                ]"
              >
                <Icon :name="novel.isLiked ? 'ph:heart-fill' : 'ph:heart'" class="text-neuro-primary" />
                {{ novel.isLiked ? '已点赞' : '点赞' }}
              </button>

              <button
                @click="handleFavorite"
                :disabled="!user || favoriteLoading"
                :class="[
                  'btn-secondary flex items-center gap-2',
                  novel.isFavorited && 'bg-neuro-secondary/20 border-neuro-secondary'
                ]"
              >
                <Icon :name="novel.isFavorited ? 'ph:bookmark-simple-fill' : 'ph:bookmark-simple'" class="text-neuro-secondary" />
                {{ novel.isFavorited ? '已收藏' : '收藏' }}
              </button>
            </div>

            <!-- Rating -->
            <div v-if="user" class="mt-6 p-4 glass rounded-xl">
              <p class="text-sm text-white/70 mb-2">我的评分:</p>
              <div class="flex items-center gap-4">
                <StarRating v-model="userRating" />
                <Button
                  v-if="userRating !== novel.userRating"
                  @click="handleRating"
                  :loading="ratingLoading"
                  variant="primary"
                  size="sm"
                >
                  提交评分
                </Button>
              </div>
            </div>
          </div>
        </div>

        <!-- Chapters List -->
        <div class="card p-6">
          <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
            <Icon name="ph:list-numbers" />
            章节列表 ({{ novel.chapters?.length || 0 }} 章)
          </h2>

          <div v-if="novel.chapters?.length === 0" class="text-center py-8 text-white/50">
            暂无章节
          </div>
          <div v-else class="grid gap-2">
            <NuxtLink
              v-for="chapter in novel.chapters"
              :key="chapter.id"
              :to="`/novels/${novel.id}/chapters/${chapter.id}`"
              class="flex items-center justify-between p-4 rounded-xl hover:bg-white/10 transition group"
            >
              <div class="flex items-center gap-4">
                <span class="text-white/50 w-8">{{ chapter.order }}</span>
                <span class="group-hover:text-neuro-primary transition">{{ chapter.title }}</span>
              </div>
              <div class="flex items-center gap-4 text-sm text-white/50">
                <span>{{ chapter.wordCount }} 字</span>
                <span>{{ formatDate(chapter.createdAt) }}</span>
                <Icon name="ph:caret-right" class="group-hover:translate-x-1 transition" />
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- Related Recommendations -->
        <div class="mt-12 space-y-12">
          <!-- Loading State -->
          <div v-if="recLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="i in 6" :key="i" class="card p-4 animate-pulse">
              <div class="flex gap-4">
                <div class="w-16 h-24 bg-white/10 rounded-lg flex-shrink-0" />
                <div class="flex-1 space-y-2">
                  <div class="h-4 bg-white/10 rounded w-3/4" />
                  <div class="h-3 bg-white/10 rounded w-1/2" />
                  <div class="h-3 bg-white/10 rounded w-2/3" />
                  <div class="h-3 bg-white/10 rounded w-1/3 mt-4" />
                </div>
              </div>
            </div>
          </div>

          <!-- People Also Viewed -->
          <section v-else-if="similarUsersNovels.length > 0">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-2xl font-bold flex items-center gap-2">
                <Icon name="ph:users-fill" class="text-neuro-primary" />
                看过这本书的人还看了
              </h2>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div
                v-for="item in similarUsersNovels"
                :key="item.id"
                class="card p-4 hover:bg-white/10 transition group relative"
              >
                <div class="flex gap-4">
                  <NuxtLink
                    :to="`/novels/${item.id}`"
                    class="w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden"
                  >
                    <img
                      :src="item.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200'"
                      :alt="item.title"
                      class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </NuxtLink>
                  <div class="flex-1 min-w-0">
                    <NuxtLink
                      :to="`/novels/${item.id}`"
                      class="font-medium line-clamp-2 hover:text-neuro-primary transition block mb-1"
                    >
                      {{ item.title }}
                    </NuxtLink>
                    <p class="text-xs text-white/50 mb-2">{{ item.author?.username || '匿名作者' }}</p>
                    <div class="flex items-center gap-3 text-xs text-white/50 mb-2">
                      <span class="flex items-center gap-1">
                        <Icon name="ph:bookmark-simple-fill" class="text-neuro-secondary" />
                        {{ item._count?.favorites || 0 }}
                      </span>
                      <span class="flex items-center gap-1">
                        <Icon name="ph:star-fill" class="text-yellow-400" />
                        {{ item.avgRating || 0 }}
                      </span>
                    </div>
                    <p
                      v-for="(reason, idx) in item.recommendation?.reasons?.slice(0, 1)"
                      :key="idx"
                      class="text-xs text-neuro-primary/80 flex items-center gap-1 line-clamp-1"
                    >
                      <Icon name="ph:lightbulb-fill" class="flex-shrink-0" />
                      <span class="truncate">{{ reason }}</span>
                    </p>
                    <p
                      v-if="!item.recommendation?.reasons?.length"
                      class="text-xs text-white/40 flex items-center gap-1"
                    >
                      <Icon name="ph:star-fill" class="flex-shrink-0" />
                      <span>热门作品推荐</span>
                    </p>
                  </div>
                </div>
                <button
                  @click="handleNotInterested(item.id, 'SIMILAR_USERS')"
                  class="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 text-white/50 opacity-0 group-hover:opacity-100 hover:bg-red-500/70 hover:text-white transition-all flex items-center justify-center"
                  title="不感兴趣"
                >
                  <Icon name="ph:x" class="text-xs" />
                </button>
              </div>
            </div>
          </section>

          <!-- Similar Tags -->
          <section v-else-if="similarTagsNovels.length > 0">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-2xl font-bold flex items-center gap-2">
                <Icon name="ph:tag-fill" class="text-neuro-accent" />
                同类型推荐
              </h2>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div
                v-for="item in similarTagsNovels"
                :key="item.id"
                class="card p-4 hover:bg-white/10 transition group relative"
              >
                <div class="flex gap-4">
                  <NuxtLink
                    :to="`/novels/${item.id}`"
                    class="w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden"
                  >
                    <img
                      :src="item.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200'"
                      :alt="item.title"
                      class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </NuxtLink>
                  <div class="flex-1 min-w-0">
                    <NuxtLink
                      :to="`/novels/${item.id}`"
                      class="font-medium line-clamp-2 hover:text-neuro-primary transition block mb-1"
                    >
                      {{ item.title }}
                    </NuxtLink>
                    <p class="text-xs text-white/50 mb-2">{{ item.author?.username || '匿名作者' }}</p>
                    <div class="flex items-center gap-3 text-xs text-white/50 mb-2">
                      <span class="flex items-center gap-1">
                        <Icon name="ph:bookmark-simple-fill" class="text-neuro-secondary" />
                        {{ item._count?.favorites || 0 }}
                      </span>
                      <span class="flex items-center gap-1">
                        <Icon name="ph:star-fill" class="text-yellow-400" />
                        {{ item.avgRating || 0 }}
                      </span>
                    </div>
                    <p
                      v-for="(reason, idx) in item.recommendation?.reasons?.slice(0, 1)"
                      :key="idx"
                      class="text-xs text-neuro-accent/80 flex items-center gap-1 line-clamp-1"
                    >
                      <Icon name="ph:lightbulb-fill" class="flex-shrink-0" />
                      <span class="truncate">{{ reason }}</span>
                    </p>
                    <p
                      v-if="!item.recommendation?.reasons?.length"
                      class="text-xs text-white/40 flex items-center gap-1"
                    >
                      <Icon name="ph:star-fill" class="flex-shrink-0" />
                      <span>热门作品推荐</span>
                    </p>
                  </div>
                </div>
                <button
                  @click="handleNotInterested(item.id, 'SIMILAR_TAGS')"
                  class="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 text-white/50 opacity-0 group-hover:opacity-100 hover:bg-red-500/70 hover:text-white transition-all flex items-center justify-center"
                  title="不感兴趣"
                >
                  <Icon name="ph:x" class="text-xs" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <!-- Not Found -->
      <div v-else class="text-center py-20">
        <Icon name="ph:warning" class="text-6xl text-white/30 mb-4" />
        <p class="text-xl text-white/50">小说不存在</p>
        <NuxtLink to="/novels" class="btn-primary mt-4 inline-block">
          返回小说库
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { user } = useAuth()
const toast = useToast()

const novelId = computed(() => Number(route.params.id))

const { data: novel, pending, refresh } = await useFetch(`/api/novels/${novelId.value}`)

const userRating = ref(novel.value?.userRating || 0)
const likeLoading = ref(false)
const favoriteLoading = ref(false)
const ratingLoading = ref(false)
const recLoading = ref(false)
const similarUsersNovels = ref<any[]>([])
const similarTagsNovels = ref<any[]>([])

watch(() => novel.value?.userRating, (val) => {
  userRating.value = val || 0
})

const statusLabels: Record<string, string> = {
  ONGOING: '连载中',
  COMPLETED: '已完结',
  HIATUS: '暂停更新'
}

const statusClasses: Record<string, string> = {
  ONGOING: 'bg-green-500/80 text-white',
  COMPLETED: 'bg-blue-500/80 text-white',
  HIATUS: 'bg-yellow-500/80 text-white'
}

const formatNumber = (num: number) => {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

async function fetchRecommendations() {
  if (!novelId.value) return
  recLoading.value = true
  try {
    const res: any = await $fetch(`/api/recommendations/novel/${novelId.value}`)
    similarUsersNovels.value = res.similarUsers || []
    similarTagsNovels.value = res.similarTags || []
  } catch (e: any) {
    console.error('[Recommendation] Failed to load:', e)
    similarUsersNovels.value = []
    similarTagsNovels.value = []
  } finally {
    recLoading.value = false
  }
}

async function handleNotInterested(novelIdParam: number, recType: string) {
  try {
    await $fetch('/api/recommendations/feedback', {
      method: 'POST',
      body: {
        novelId: novelIdParam,
        type: 'NOT_INTERESTED',
        recommendationType: recType
      }
    })
    similarUsersNovels.value = similarUsersNovels.value.filter(n => n.id !== novelIdParam)
    similarTagsNovels.value = similarTagsNovels.value.filter(n => n.id !== novelIdParam)
    toast.success('已记录，将不再推荐此类内容')
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  }
}

const handleLike = async () => {
  if (!user.value) {
    toast.warning('请先登录')
    return
  }
  likeLoading.value = true
  try {
    await $fetch(`/api/novels/${novelId.value}/like`, { method: 'POST' })
    await refresh()
    toast.success(novel.value?.isLiked ? '点赞成功' : '已取消点赞')
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  } finally {
    likeLoading.value = false
  }
}

const handleFavorite = async () => {
  if (!user.value) {
    toast.warning('请先登录')
    return
  }
  favoriteLoading.value = true
  try {
    await $fetch(`/api/novels/${novelId.value}/favorite`, { method: 'POST' })
    await refresh()
    toast.success(novel.value?.isFavorited ? '收藏成功' : '已取消收藏')
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  } finally {
    favoriteLoading.value = false
  }
}

const handleRating = async () => {
  ratingLoading.value = true
  try {
    await $fetch(`/api/novels/${novelId.value}/rating`, {
      method: 'POST',
      body: { score: userRating.value }
    })
    await refresh()
    toast.success('评分成功')
  } catch (e: any) {
    toast.error(e.message || '评分失败')
  } finally {
    ratingLoading.value = false
  }
}

watch(novelId, () => {
  if (novelId.value) {
    fetchRecommendations()
  }
})

if (novelId.value) {
  fetchRecommendations()
}

useHead({
  title: computed(() => novel.value ? `${novel.value.title} - Neurosama 粉丝小说站` : '加载中...')
})
</script>
