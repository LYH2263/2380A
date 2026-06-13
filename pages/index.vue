<template>
  <div class="min-h-screen">
    <!-- Hero Section -->
    <section class="relative py-20 overflow-hidden">
      <!-- Animated Background -->
      <div class="absolute inset-0 overflow-hidden">
        <div class="absolute w-96 h-96 -top-48 -left-48 bg-neuro-primary/30 rounded-full blur-3xl animate-float" />
        <div class="absolute w-96 h-96 -bottom-48 -right-48 bg-neuro-secondary/30 rounded-full blur-3xl animate-float" style="animation-delay: 1s;" />
      </div>

      <div class="container mx-auto px-4 relative">
        <div class="max-w-3xl mx-auto text-center">
          <h1 class="text-5xl md:text-6xl font-bold mb-6">
            <span class="bg-gradient-to-r from-neuro-primary via-neuro-secondary to-neuro-accent bg-clip-text text-transparent">
              Neurosama
            </span>
            <br />
            粉丝二创小说站
          </h1>
          <p class="text-xl text-white/70 mb-8">
            在这里，探索关于 Neuro-sama、Evil Neuro 和 Vedal 的奇妙故事
            <br />
            沉浸在粉丝们创作的无限想象中 💜
          </p>
          <div class="flex justify-center gap-4">
            <NuxtLink to="/novels" class="btn-primary">
              <Icon name="ph:book-open" class="mr-2" />
              开始阅读
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Rankings Section -->
    <section class="py-16">
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-2xl font-bold flex items-center gap-2">
            <Icon name="ph:trophy-fill" class="text-yellow-400" />
            排行榜
          </h2>
          <NuxtLink to="/rankings" class="text-neuro-primary hover:underline">
            查看完整榜单 →
          </NuxtLink>
        </div>

        <div class="flex flex-wrap gap-2 mb-6">
          <button
            v-for="tab in rankingTabs"
            :key="tab.type"
            @click="activeRankingTab = tab.type"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeRankingTab === tab.type
                ? 'bg-gradient-to-r from-neuro-primary to-neuro-secondary text-white'
                : 'glass hover:bg-white/10 text-white/70'
            ]"
          >
            <Icon :name="tab.icon" class="mr-1.5" />
            {{ tab.label }}
          </button>
        </div>

        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="i in 6" :key="i" class="card p-4 animate-pulse">
            <div class="flex items-center gap-3">
              <div class="w-6 h-6 bg-white/10 rounded" />
              <div class="w-12 h-16 bg-white/10 rounded" />
              <div class="flex-1">
                <div class="h-4 bg-white/10 rounded w-1/2 mb-2" />
                <div class="h-3 bg-white/10 rounded w-1/3" />
              </div>
            </div>
          </div>
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="(item, index) in currentRankings"
            :key="item.id"
            class="card p-4 hover:bg-white/10 transition group"
          >
            <div class="flex items-center gap-3">
              <div class="w-6 text-center">
                <span
                  :class="[
                    'text-lg font-bold',
                    index < 3 ? rankingColors[index] : 'text-white/40'
                  ]"
                >
                  {{ index + 1 }}
                </span>
              </div>

              <NuxtLink
                :to="`/novels/${item.id}`"
                class="w-10 h-14 flex-shrink-0 rounded overflow-hidden"
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
                  class="font-medium line-clamp-1 hover:text-neuro-primary transition"
                >
                  {{ item.title }}
                </NuxtLink>
                <div class="flex items-center gap-2 mt-1 text-xs text-white/40">
                  <span>{{ item.author?.username }}</span>
                  <span>·</span>
                  <span>{{ item._count?.chapters || 0 }} 章</span>
                </div>
              </div>

              <div class="text-right flex-shrink-0">
                <div
                  :class="[
                    'text-sm font-bold',
                    activeRankingTab === 'RATING' ? 'text-yellow-400' :
                    activeRankingTab === 'FAVORITE' ? 'text-pink-400' : 'text-neuro-primary'
                  ]"
                >
                  <template v-if="activeRankingTab === 'RATING'">
                    <Icon name="ph:star-fill" class="mr-0.5" />
                    {{ item.avgRating?.toFixed(1) || '0.0' }}
                  </template>
                  <template v-else-if="activeRankingTab === 'FAVORITE'">
                    <Icon name="ph:heart-fill" class="mr-0.5" />
                    {{ formatNumber(item._count?.favorites || item.favoriteCount || 0) }}
                  </template>
                  <template v-else>
                    <Icon name="ph:eye" class="mr-0.5" />
                    {{ formatNumber(item.viewCount) }}
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Personalized Recommendations -->
    <section v-if="user" class="py-16">
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-2xl font-bold flex items-center gap-2">
            <Icon name="ph:magic-wand-fill" class="text-neuro-accent" />
            猜你喜欢
          </h2>
          <div class="flex items-center gap-4">
            <button
              v-if="recommendations.length > 0"
              @click="refreshRecommendations"
              :disabled="recLoading"
              class="text-sm text-white/60 hover:text-neuro-primary transition flex items-center gap-1"
            >
              <Icon :name="recLoading ? 'ph:spinner-gap-bold' : 'ph:arrow-clockwise'" :class="recLoading ? 'animate-spin' : ''" />
              换一批
            </button>
            <NuxtLink to="/novels" class="text-neuro-accent hover:underline">
              查看更多 →
            </NuxtLink>
          </div>
        </div>

        <div v-if="needsOnboarding" class="card p-8 text-center">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-neuro-accent to-neuro-primary flex items-center justify-center">
            <Icon name="ph:sparkle-fill" class="text-3xl text-white" />
          </div>
          <h3 class="text-xl font-bold mb-2">发现更适合你的作品</h3>
          <p class="text-white/60 mb-6 max-w-md mx-auto">
            花 10 秒钟选择你感兴趣的标签，我们将为你量身定制个性化推荐
          </p>
          <NuxtLink to="/onboarding" class="btn-primary inline-flex items-center">
            <Icon name="ph:arrow-right" class="mr-2" />
            开始选择
          </NuxtLink>
        </div>

        <div v-else-if="recLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <NovelCardSkeleton v-for="i in 8" :key="i" />
        </div>

        <div v-else-if="recommendations.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="novel in recommendations"
            :key="novel.id"
            class="relative group"
          >
            <NovelCard :novel="novel" />
            <div class="mt-2 space-y-1">
              <p
                v-for="(reason, idx) in novel.recommendation?.reasons?.slice(0, 1)"
                :key="idx"
                class="text-xs text-neuro-accent/80 flex items-center gap-1"
              >
                <Icon name="ph:lightbulb-fill" class="flex-shrink-0" />
                <span class="truncate">{{ reason }}</span>
              </p>
            </div>
            <button
              @click="handleNotInterested(novel.id)"
              class="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white/60 opacity-0 group-hover:opacity-100 hover:bg-red-500/80 hover:text-white transition-all flex items-center justify-center backdrop-blur-sm"
              title="不感兴趣"
            >
              <Icon name="ph:x" class="text-sm" />
            </button>
          </div>
        </div>

        <div v-else class="card p-8 text-center">
          <Icon name="ph:book-open" class="text-5xl text-white/20 mb-4" />
          <p class="text-white/60">暂无推荐，去看看热门小说吧！</p>
        </div>
      </div>
    </section>

    <!-- Popular Novels -->
    <section class="py-16">
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-2xl font-bold flex items-center gap-2">
            <Icon name="ph:fire-simple-fill" class="text-neuro-primary" />
            热门小说
          </h2>
          <NuxtLink to="/novels?sort=popular" class="text-neuro-primary hover:underline">
            查看更多 →
          </NuxtLink>
        </div>

        <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <NovelCardSkeleton v-for="i in 4" :key="i" />
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <NovelCard v-for="novel in popularNovels" :key="novel.id" :novel="novel" />
        </div>
      </div>
    </section>

    <!-- Latest Novels -->
    <section class="py-16">
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-2xl font-bold flex items-center gap-2">
            <Icon name="ph:clock-fill" class="text-neuro-secondary" />
            最新更新
          </h2>
          <NuxtLink to="/novels?sort=latest" class="text-neuro-secondary hover:underline">
            查看更多 →
          </NuxtLink>
        </div>

        <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <NovelCardSkeleton v-for="i in 4" :key="i" />
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <NovelCard v-for="novel in latestNovels" :key="novel.id" :novel="novel" />
        </div>
      </div>
    </section>

    <!-- Tags Section -->
    <section class="py-16">
      <div class="container mx-auto px-4">
        <h2 class="text-2xl font-bold mb-8 flex items-center gap-2">
          <Icon name="ph:tag-fill" class="text-neuro-accent" />
          热门标签
        </h2>
        <div class="flex flex-wrap gap-3">
          <NuxtLink
            v-for="tag in tags"
            :key="tag.name"
            :to="`/novels?tag=${tag.name}`"
            class="px-4 py-2 glass rounded-full hover:bg-white/20 transition flex items-center gap-2"
          >
            <span>#{{ tag.name }}</span>
            <span class="text-white/50 text-sm">({{ tag.count }})</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- CTA Section - Only show for non-logged-in users -->
    <section v-if="!user" class="py-20">
      <div class="container mx-auto px-4">
        <div class="card p-12 text-center animate-glow">
          <h2 class="text-3xl font-bold mb-4">
            准备好分享你的故事了吗？
          </h2>
          <p class="text-white/70 mb-8 max-w-xl mx-auto">
            加入我们的创作者社区，让你的 Neurosama 同人故事被更多人看到！
          </p>
          <NuxtLink to="/auth/register" class="btn-primary inline-flex items-center">
            <Icon name="ph:pencil-simple" class="mr-2" />
            立即开始创作
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const { user, fetchUser } = useAuth()
const toast = useToast()

await fetchUser()

const loading = ref(true)
const recLoading = ref(false)
const popularNovels = ref<any[]>([])
const latestNovels = ref<any[]>([])
const tags = ref<any[]>([])
const recommendations = ref<any[]>([])
const needsOnboarding = ref(false)

const rankingTabs = [
  { type: 'POPULARITY', label: '人气榜', icon: 'ph:fire-fill' },
  { type: 'RATING', label: '好评榜', icon: 'ph:star-fill' },
  { type: 'FAVORITE', label: '收藏榜', icon: 'ph:heart-fill' },
  { type: 'NEW_BOOK', label: '新书榜', icon: 'ph:sparkle-fill' },
  { type: 'COMPLETED', label: '完结榜', icon: 'ph:check-circle-fill' }
]

const rankingColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600']
const activeRankingTab = ref('POPULARITY')
const homeRankings = ref<Record<string, any[]>>({})

const currentRankings = computed(() => {
  return homeRankings.value[activeRankingTab.value] || []
})

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

async function fetchRecommendations() {
  if (!user.value) return
  recLoading.value = true
  try {
    const res: any = await $fetch('/api/recommendations/for-you', {
      query: { limit: 8, _t: Date.now() }
    })
    recommendations.value = res.novels || []
    needsOnboarding.value = res.needsOnboarding || false
  } catch (e) {
    recommendations.value = []
  } finally {
    recLoading.value = false
  }
}

async function refreshRecommendations() {
  if (!user.value) return
  recLoading.value = true
  try {
    const res: any = await $fetch('/api/recommendations/for-you', {
      query: { limit: 8, _t: Date.now(), refresh: 1 }
    })
    recommendations.value = res.novels || []
    toast.success('已刷新推荐')
  } catch (e: any) {
    toast.error(e.message || '刷新失败')
  } finally {
    recLoading.value = false
  }
}

async function handleNotInterested(novelId: number) {
  try {
    await $fetch('/api/recommendations/feedback', {
      method: 'POST',
      body: {
        novelId,
        type: 'NOT_INTERESTED',
        recommendationType: 'PERSONALIZED'
      }
    })
    recommendations.value = recommendations.value.filter(n => n.id !== novelId)
    toast.success('已记录，将不再推荐此类内容')
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  }
}

const [popularRes, latestRes, tagsRes, rankingsRes] = await Promise.all([
  useFetch('/api/novels', { query: { sort: 'popular', limit: 4 } }),
  useFetch('/api/novels', { query: { sort: 'latest', limit: 4 } }),
  useFetch('/api/tags'),
  useFetch('/api/rankings/home')
])

popularNovels.value = popularRes.data.value?.novels || []
latestNovels.value = latestRes.data.value?.novels || []
tags.value = tagsRes.data.value?.tags?.slice(0, 10) || []
homeRankings.value = rankingsRes.data.value?.rankings || {}
loading.value = false

if (user.value) {
  fetchRecommendations()
}

useHead({
  title: 'Neurosama 粉丝小说站 - 首页',
  meta: [
    { name: 'description', content: 'Neurosama 粉丝二创小说阅读平台，探索关于 Neuro-sama、Evil Neuro 和 Vedal 的奇妙故事' }
  ]
})
</script>
