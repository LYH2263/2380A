<template>
  <div class="min-h-screen py-8">
    <div class="container mx-auto px-4">
      <div v-if="userPending || activitiesPending" class="flex flex-col items-center py-20">
        <Icon name="ph:spinner" class="text-5xl animate-spin text-neuro-primary mb-4" />
        <p class="text-white/60">加载中...</p>
      </div>

      <div v-else-if="userError" class="text-center py-20">
        <Icon name="ph:user-x" class="text-6xl text-white/30 mb-4" />
        <p class="text-xl text-white/50">用户不存在</p>
        <NuxtLink to="/novels" class="btn-primary mt-4 inline-block">
          返回首页
        </NuxtLink>
      </div>

      <div v-else class="space-y-8">
        <div class="card p-8">
          <div class="flex flex-col md:flex-row items-center md:items-start gap-6">
            <img
              :src="userData?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + userData?.username"
              :alt="userData?.username"
              class="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-neuro-primary/30 shadow-xl"
            />
            <div class="flex-1 text-center md:text-left">
              <div class="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                <h1 class="text-2xl md:text-3xl font-bold">
                  {{ userData?.username }}
                  <span v-if="userData?.role === 'ADMIN'" class="ml-2 px-2 py-0.5 bg-neuro-primary/30 text-neuro-primary text-xs rounded-full">
                    管理员
                  </span>
                </h1>
                <div class="flex items-center justify-center md:justify-start gap-3">
                  <NuxtLink
                    v-if="!isOwnProfile"
                    :to="`/user/${userData?.username}/following`"
                    class="text-white/60 hover:text-neuro-primary transition"
                  >
                    关注 <span class="font-semibold text-white">{{ userData?.stats.followingCount }}</span>
                  </NuxtLink>
                  <span class="text-white/20">|</span>
                  <NuxtLink
                    v-if="!isOwnProfile"
                    :to="`/user/${userData?.username}/followers`"
                    class="text-white/60 hover:text-neuro-primary transition"
                  >
                    粉丝 <span class="font-semibold text-white">{{ userData?.stats.followersCount }}</span>
                  </NuxtLink>
                </div>
              </div>

              <div class="flex items-center justify-center md:justify-start gap-2 text-white/50 text-sm mb-4">
                <Icon name="ph:calendar" />
                <span>注册于 {{ formatDate(userData?.createdAt) }}</span>
              </div>

              <p v-if="userData?.bio" class="text-white/70 max-w-2xl mb-4">
                {{ userData?.bio }}
              </p>
              <p v-else class="text-white/40 italic mb-4">
                这个人很懒，什么都没写...
              </p>

              <div class="flex flex-wrap gap-4 justify-center md:justify-start">
                <div class="glass px-4 py-2 rounded-xl">
                  <div class="text-2xl font-bold text-neuro-primary">{{ userData?.stats.novelsCount }}</div>
                  <div class="text-xs text-white/50">投稿小说</div>
                </div>
                <div class="glass px-4 py-2 rounded-xl">
                  <div class="text-2xl font-bold text-pink-400">{{ userData?.stats.totalLikes }}</div>
                  <div class="text-xs text-white/50">获得点赞</div>
                </div>
                <div class="glass px-4 py-2 rounded-xl">
                  <div class="text-2xl font-bold text-yellow-400">{{ userData?.stats.totalFavorites }}</div>
                  <div class="text-xs text-white/50">获得收藏</div>
                </div>
              </div>
            </div>

            <div v-if="!isOwnProfile" class="flex flex-col gap-2">
              <Button
                :variant="userData?.isFollowing ? 'secondary' : 'primary'"
                :loading="followLoading"
                @click="handleFollow"
              >
                <span class="flex items-center gap-2">
                  <Icon :name="userData?.isFollowing ? 'ph:user-check' : 'ph:user-plus'" />
                  {{ userData?.isFollowing ? '已关注' : '关注' }}
                </span>
              </Button>
            </div>
          </div>
        </div>

        <div class="card p-8">
          <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
            <Icon name="ph:activity" class="text-neuro-primary" />
            最近动态
          </h2>

          <div v-if="hasActivities" class="space-y-8">
            <div v-if="activities.today.length > 0">
              <h3 class="text-sm font-semibold text-neuro-primary mb-4 flex items-center gap-2">
                <Icon name="ph:sun" />
                今天
              </h3>
              <div class="space-y-3">
                <div
                  v-for="activity in activities.today"
                  :key="activity.id"
                  class="flex items-start gap-4 glass p-4 rounded-xl"
                >
                  <div class="w-10 h-10 rounded-full bg-neuro-primary/20 flex items-center justify-center flex-shrink-0">
                    <Icon :name="getActivityIcon(activity.type)" class="text-neuro-primary" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-white/90" v-html="getActivityText(activity)"></p>
                    <p class="text-white/40 text-xs mt-1">{{ formatTime(activity.createdAt) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="activities.yesterday.length > 0">
              <h3 class="text-sm font-semibold text-blue-400 mb-4 flex items-center gap-2">
                <Icon name="ph:moon" />
                昨天
              </h3>
              <div class="space-y-3">
                <div
                  v-for="activity in activities.yesterday"
                  :key="activity.id"
                  class="flex items-start gap-4 glass p-4 rounded-xl"
                >
                  <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon :name="getActivityIcon(activity.type)" class="text-blue-400" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-white/90" v-html="getActivityText(activity)"></p>
                    <p class="text-white/40 text-xs mt-1">{{ formatTime(activity.createdAt) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="activities.earlier.length > 0">
              <h3 class="text-sm font-semibold text-white/50 mb-4 flex items-center gap-2">
                <Icon name="ph:clock" />
                更早
              </h3>
              <div class="space-y-3">
                <div
                  v-for="activity in activities.earlier"
                  :key="activity.id"
                  class="flex items-start gap-4 glass p-4 rounded-xl"
                >
                  <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon :name="getActivityIcon(activity.type)" class="text-white/50" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-white/90" v-html="getActivityText(activity)"></p>
                    <p class="text-white/40 text-xs mt-1">{{ formatTime(activity.createdAt) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-12">
            <Icon name="ph:ghost" class="text-5xl text-white/30 mb-4" />
            <p class="text-white/50">还没有任何动态</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'

const route = useRoute()
const { user: currentUser } = useAuth()
const username = computed(() => route.params.username as string)

const { data: userData, pending: userPending, error: userError, refresh: refreshUser } = await useFetch(
  () => `/api/user/${username.value}`,
  { watch: [username] }
)

const { data: activitiesData, pending: activitiesPending } = await useFetch(
  () => `/api/user/${username.value}/activities`,
  { watch: [username] }
)

const followLoading = ref(false)

const isOwnProfile = computed(() => {
  return currentUser.value?.username === username.value
})

const activities = computed(() => ({
  today: activitiesData.value?.activities.today || [],
  yesterday: activitiesData.value?.activities.yesterday || [],
  earlier: activitiesData.value?.activities.earlier || []
}))

const hasActivities = computed(() => {
  return activities.value.today.length > 0 ||
    activities.value.yesterday.length > 0 ||
    activities.value.earlier.length > 0
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

const getActivityIcon = (type: string) => {
  const icons: Record<string, string> = {
    NOVEL_PUBLISHED: 'ph:book-open',
    CHAPTER_PUBLISHED: 'ph:file-text',
    COMMENT_POSTED: 'ph:chat-circle',
    RATING_SUBMITTED: 'ph:star'
  }
  return icons[type] || 'ph:circle'
}

const getActivityText = (activity: any) => {
  const metadata = activity.metadata || {}
  const novelLink = activity.novel
    ? `<a href="/novels/${activity.novel.id}" class="text-neuro-primary hover:underline">${metadata.novelTitle || activity.novel.title}</a>`
    : metadata.novelTitle

  switch (activity.type) {
    case 'NOVEL_PUBLISHED':
      return `发布了新小说 ${novelLink}`
    case 'CHAPTER_PUBLISHED':
      return `在 ${novelLink} 中发布了新章节 <span class="text-white/70">${metadata.chapterTitle}</span>`
    case 'COMMENT_POSTED':
      return `在 ${novelLink} 的 <span class="text-white/70">${metadata.chapterTitle}</span> 中发表了评论`
    case 'RATING_SUBMITTED':
      return `给 ${novelLink} 打了 <span class="text-yellow-400">${metadata.score} 星</span>`
    default:
      return '进行了某项操作'
  }
}

const handleFollow = async () => {
  if (!currentUser.value) {
    await navigateTo('/auth/login')
    return
  }

  followLoading.value = true
  try {
    const { data } = await useFetch(`/api/user/${username.value}/follow`, {
      method: 'POST'
    })
    if (data.value?.success) {
      refreshUser()
    }
  } catch (error: any) {
    console.error('关注失败:', error)
  } finally {
    followLoading.value = false
  }
}

useHead(() => ({
  title: `${userData.value?.username || '用户'} 的主页 - Neurosama 粉丝小说站`
}))
</script>
