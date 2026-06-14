<template>
  <div class="min-h-screen py-12">
    <div class="container mx-auto px-4">
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold mb-4">
          <Icon name="ph:trophy-fill" class="text-yellow-400 mr-3" />
          排行榜
        </h1>
        <p class="text-white/60">发现最受欢迎的 Neurosama 同人小说</p>
      </div>

      <div class="flex flex-wrap justify-center gap-2 mb-8">
        <button
          v-for="tab in rankingTabs"
          :key="tab.type"
          @click="selectTab(tab.type)"
          :class="[
            'px-6 py-3 rounded-xl font-medium transition-all',
            activeTab === tab.type
              ? 'bg-gradient-to-r from-neuro-primary to-neuro-secondary text-white shadow-lg shadow-neuro-primary/30'
              : 'glass hover:bg-white/10 text-white/70'
          ]"
        >
          <Icon :name="tab.icon" class="mr-2" />
          {{ tab.label }}
        </button>
      </div>

      <div class="flex justify-center gap-2 mb-8">
        <button
          v-for="p in periodTabs"
          :key="p.value"
          @click="selectPeriod(p.value)"
          :class="[
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activePeriod === p.value
              ? 'bg-white/20 text-white'
              : 'text-white/50 hover:text-white/80'
          ]"
        >
          {{ p.label }}
        </button>
      </div>

      <div v-if="loading" class="max-w-4xl mx-auto">
        <div v-for="i in 10" :key="i" class="card p-4 mb-3 animate-pulse">
          <div class="flex items-center gap-4">
            <div class="w-8 h-8 bg-white/10 rounded" />
            <div class="w-16 h-20 bg-white/10 rounded" />
            <div class="flex-1">
              <div class="h-5 bg-white/10 rounded w-1/3 mb-2" />
              <div class="h-4 bg-white/10 rounded w-1/2 mb-2" />
              <div class="h-3 bg-white/10 rounded w-1/4" />
            </div>
            <div class="w-16 h-8 bg-white/10 rounded" />
          </div>
        </div>
      </div>

      <div v-else class="max-w-4xl mx-auto">
        <div
          v-for="item in rankings"
          :key="item.id"
          class="card p-4 mb-3 hover:bg-white/10 transition group"
        >
          <div class="flex items-center gap-4">
            <div class="w-8 text-center">
              <span
                :class="[
                  'text-2xl font-bold',
                  item.rank <= 3 ? rankingColors[item.rank - 1] : 'text-white/50'
                ]"
              >
                {{ item.rank }}
              </span>
            </div>

            <div class="w-6 text-center">
              <span v-if="item.trend === 'up'" class="text-green-400 flex items-center justify-center">
                <Icon name="ph:trend-up" />
                <span class="text-xs ml-0.5">{{ item.trendValue }}</span>
              </span>
              <span v-else-if="item.trend === 'down'" class="text-red-400 flex items-center justify-center">
                <Icon name="ph:trend-down" />
                <span class="text-xs ml-0.5">{{ item.trendValue }}</span>
              </span>
              <span v-else-if="item.trend === 'same'" class="text-white/30">
                <Icon name="ph:minus" />
              </span>
              <span v-else class="text-yellow-400 text-xs font-medium">NEW</span>
            </div>

            <NuxtLink
              :to="`/novels/${item.id}`"
              class="w-14 h-20 flex-shrink-0 rounded overflow-hidden"
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
                class="font-bold text-lg line-clamp-1 hover:text-neuro-primary transition"
              >
                {{ item.title }}
              </NuxtLink>
              <p class="text-white/50 text-sm line-clamp-1 mt-1">
                {{ item.description }}
              </p>
              <div class="flex items-center gap-3 mt-2 text-sm text-white/40">
                <span class="flex items-center gap-1">
                  <img
                    :src="item.author?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'"
                    :alt="item.author?.username"
                    class="w-4 h-4 rounded-full"
                  />
                  {{ item.author?.username }}
                </span>
                <span>{{ item._count?.chapters || 0 }} 章</span>
                <span
                  :class="[
                    'px-2 py-0.5 rounded text-xs',
                    statusClasses[item.status]
                  ]"
                >
                  {{ statusLabels[item.status] }}
                </span>
              </div>
            </div>

            <div class="text-right flex-shrink-0">
              <div v-if="activeTab === 'POPULARITY'" class="text-lg font-bold text-neuro-primary">
                <Icon name="ph:eye" class="mr-1" />
                {{ formatNumber(getDisplayValue(item, 'viewCount')) }}
              </div>
              <div v-else-if="activeTab === 'RATING'" class="text-lg font-bold text-yellow-400">
                <Icon name="ph:star-fill" class="mr-1" />
                {{ getDisplayValue(item, 'avgRating').toFixed(1) }}
              </div>
              <div v-else-if="activeTab === 'FAVORITE'" class="text-lg font-bold text-pink-400">
                <Icon name="ph:heart-fill" class="mr-1" />
                {{ formatNumber(getDisplayValue(item, 'favoriteCount')) }}
              </div>
              <div v-else-if="activeTab === 'NEW_BOOK'" class="text-lg font-bold text-green-400">
                <Icon name="ph:eye" class="mr-1" />
                {{ formatNumber(item.viewCount) }}
              </div>
              <div v-else-if="activeTab === 'COMPLETED'" class="text-lg font-bold text-blue-400">
                <Icon name="ph:eye" class="mr-1" />
                {{ formatNumber(getDisplayValue(item, 'viewCount')) }}
              </div>
              <div class="text-xs text-white/40 mt-1">
                {{ getStatLabel() }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="rankings.length === 0" class="card p-12 text-center">
          <Icon name="ph:book-open" class="text-6xl text-white/20 mb-4" />
          <p class="text-white/50">暂无排名数据</p>
        </div>

        <div v-if="totalPages > 1" class="flex justify-center items-center gap-2 mt-8">
          <button
            @click="changePage(currentPage - 1)"
            :disabled="currentPage <= 1"
            class="px-4 py-2 rounded-lg glass disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition"
          >
            <Icon name="ph:caret-left" />
          </button>

          <div class="flex items-center gap-1">
            <button
              v-for="page in visiblePages"
              :key="page"
              @click="changePage(page)"
              :class="[
                'w-10 h-10 rounded-lg font-medium transition',
                currentPage === page
                  ? 'bg-neuro-primary text-white'
                  : 'glass hover:bg-white/10 text-white/70'
              ]"
            >
              {{ page }}
            </button>
          </div>

          <button
            @click="changePage(currentPage + 1)"
            :disabled="currentPage >= totalPages"
            class="px-4 py-2 rounded-lg glass disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition"
          >
            <Icon name="ph:caret-right" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()

const rankingTabs = [
  { type: 'POPULARITY', label: '人气榜', icon: 'ph:fire-fill' },
  { type: 'RATING', label: '好评榜', icon: 'ph:star-fill' },
  { type: 'FAVORITE', label: '收藏榜', icon: 'ph:heart-fill' },
  { type: 'NEW_BOOK', label: '新书榜', icon: 'ph:sparkle-fill' },
  { type: 'COMPLETED', label: '完结榜', icon: 'ph:check-circle-fill' }
]

const periodTabs = [
  { value: 'WEEK', label: '周榜' },
  { value: 'MONTH', label: '月榜' },
  { value: 'ALL', label: '总榜' }
]

const rankingColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600']

const statusLabels: Record<string, string> = {
  ONGOING: '连载中',
  COMPLETED: '已完结',
  HIATUS: '暂停更新'
}

const statusClasses: Record<string, string> = {
  ONGOING: 'bg-green-500/20 text-green-400',
  COMPLETED: 'bg-blue-500/20 text-blue-400',
  HIATUS: 'bg-yellow-500/20 text-yellow-400'
}

const activeTab = ref(route.query.type as string || 'POPULARITY')
const activePeriod = ref(route.query.period as string || 'ALL')
const currentPage = ref(Number(route.query.page) || 1)
const loading = ref(true)
const rankings = ref<any[]>([])
const total = ref(0)
const totalPages = ref(0)
const limit = 20

const visiblePages = computed(() => {
  const pages: number[] = []
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i)
      pages.push(total)
    } else if (current >= total - 3) {
      pages.push(1)
      for (let i = total - 4; i <= total; i++) pages.push(i)
    } else {
      pages.push(1)
      for (let i = current - 1; i <= current + 1; i++) pages.push(i)
      pages.push(total)
    }
  }

  return pages
})

function selectTab(type: string) {
  activeTab.value = type
  currentPage.value = 1
  updateUrl()
  fetchRankings()
}

function selectPeriod(period: string) {
  activePeriod.value = period
  currentPage.value = 1
  updateUrl()
  fetchRankings()
}

function changePage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  updateUrl()
  window.scrollTo({ top: 0, behavior: 'smooth' })
  fetchRankings()
}

function updateUrl() {
  router.replace({
    path: '/rankings',
    query: {
      type: activeTab.value,
      period: activePeriod.value,
      page: currentPage.value
    }
  })
}

function getDisplayValue(item: any, field: string): number {
  if (activePeriod.value === 'ALL') {
    if (field === 'viewCount') return item.viewCount || 0
    if (field === 'avgRating') return item.avgRating || 0
    if (field === 'favoriteCount') return item._count?.favorites || 0
  } else {
    if (field === 'viewCount') return item.periodViewCount || item.viewCount || 0
    if (field === 'avgRating') return item.periodAvgRating || item.avgRating || 0
    if (field === 'favoriteCount') return item.periodFavoriteCount || item.favoriteCount || item._count?.favorites || 0
  }
  return 0
}

function getStatLabel(): string {
  const periodPrefix = activePeriod.value === 'WEEK' ? '本周' : 
                       activePeriod.value === 'MONTH' ? '本月' : '总'
  switch (activeTab.value) {
    case 'POPULARITY': return `${periodPrefix}阅读量`
    case 'RATING': return `${periodPrefix}平均评分`
    case 'FAVORITE': return `${periodPrefix}收藏数`
    case 'NEW_BOOK': return '阅读量'
    case 'COMPLETED': return `${periodPrefix}阅读量`
    default: return ''
  }
}

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

async function fetchRankings() {
  loading.value = true
  try {
    const { data } = await useFetch(`/api/rankings/${activeTab.value.toLowerCase()}`, {
      query: {
        period: activePeriod.value,
        page: currentPage.value,
        limit
      }
    })

    if (data.value) {
      rankings.value = data.value.items || []
      total.value = data.value.total || 0
      totalPages.value = data.value.totalPages || 0
    }
  } catch (error) {
    console.error('Failed to fetch rankings:', error)
  } finally {
    loading.value = false
  }
}

watch(() => route.query, () => {
  const type = route.query.type as string
  const period = route.query.period as string
  const page = Number(route.query.page) || 1

  if (type && type !== activeTab.value) activeTab.value = type.toUpperCase()
  if (period && period !== activePeriod.value) activePeriod.value = period.toUpperCase()
  if (page !== currentPage.value) currentPage.value = page
}, { immediate: false })

fetchRankings()

useHead({
  title: '排行榜 - Neurosama 粉丝小说站',
  meta: [
    { name: 'description', content: 'Neurosama 粉丝小说排行榜，发现最受欢迎的同人小说' }
  ]
})
</script>
