<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2">欢迎回来，{{ user?.username || '作者' }}！</h1>
      <p class="text-white/60">查看您的创作数据和作品表现</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="card p-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-white/60 text-sm">作品总数</span>
          <div class="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Icon name="ph:book-open" class="text-blue-400" />
          </div>
        </div>
        <p class="text-3xl font-bold">{{ summary?.totalNovels || 0 }}</p>
        <p class="text-sm text-white/50 mt-1">共 {{ summary?.totalChapters || 0 }} 章</p>
      </div>

      <div class="card p-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-white/60 text-sm">总阅读量</span>
          <div class="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Icon name="ph:eye" class="text-green-400" />
          </div>
        </div>
        <p class="text-3xl font-bold">{{ formatNumber(summary?.totalViews || 0) }}</p>
        <p class="text-sm text-white/50 mt-1">累计阅读</p>
      </div>

      <div class="card p-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-white/60 text-sm">总收藏数</span>
          <div class="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
            <Icon name="ph:heart" class="text-pink-400" />
          </div>
        </div>
        <p class="text-3xl font-bold">{{ formatNumber(summary?.totalFavorites || 0) }}</p>
        <p class="text-sm text-white/50 mt-1">读者收藏</p>
      </div>

      <div class="card p-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-white/60 text-sm">总评论数</span>
          <div class="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <Icon name="ph:chat-circle" class="text-yellow-400" />
          </div>
        </div>
        <p class="text-3xl font-bold">{{ formatNumber(summary?.totalComments || 0) }}</p>
        <p class="text-sm text-white/50 mt-1">互动留言</p>
      </div>
    </div>

    <!-- Weekly Trend Chart -->
    <div class="card p-6 mb-8">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold">本周数据趋势</h2>
        <div class="flex items-center gap-4 text-sm">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-blue-400"></span>
            <span class="text-white/60">阅读量</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-pink-400"></span>
            <span class="text-white/60">收藏数</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-yellow-400"></span>
            <span class="text-white/60">评论数</span>
          </div>
        </div>
      </div>

      <div ref="chartContainer" class="relative h-64 w-full">
        <canvas ref="chartCanvas" class="w-full h-full"></canvas>
      </div>
    </div>

    <!-- Recent Novels -->
    <div class="card overflow-hidden">
      <div class="p-6 border-b border-white/10 flex items-center justify-between">
        <h2 class="text-xl font-bold">我的作品</h2>
        <NuxtLink to="/author/novels" class="text-neuro-primary hover:underline text-sm">
          查看全部 →
        </NuxtLink>
      </div>

      <div v-if="!novels?.length" class="p-12 text-center text-white/50">
        <Icon name="ph:book-open" class="text-4xl mb-4" />
        <p>还没有作品</p>
        <NuxtLink to="/author/novels/new" class="btn-primary mt-4 inline-flex">
          <Icon name="ph:plus" class="mr-2" />
          创建第一部作品
        </NuxtLink>
      </div>

      <div v-else class="divide-y divide-white/10">
        <div
          v-for="novel in novels.slice(0, 5)"
          :key="novel.id"
          class="p-4 hover:bg-white/5 transition flex items-center gap-4"
        >
          <img
            :src="novel.cover || defaultCover"
            :alt="novel.title"
            class="w-16 h-20 object-cover rounded"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="font-medium truncate">{{ novel.title }}</p>
              <span :class="[
                'px-2 py-0.5 rounded text-xs',
                novel.status === 'ONGOING' ? 'bg-green-500/20 text-green-400' :
                novel.status === 'COMPLETED' ? 'bg-blue-500/20 text-blue-400' :
                'bg-yellow-500/20 text-yellow-400'
              ]">
                {{ statusLabels[novel.status] }}
              </span>
            </div>
            <div class="flex items-center gap-4 mt-2 text-sm text-white/50">
              <span class="flex items-center gap-1">
                <Icon name="ph:list" class="w-4 h-4" />
                {{ novel._count?.chapters || 0 }} 章
              </span>
              <span class="flex items-center gap-1">
                <Icon name="ph:eye" class="w-4 h-4" />
                {{ formatNumber(novel.viewCount) }}
              </span>
              <span class="flex items-center gap-1">
                <Icon name="ph:heart" class="w-4 h-4" />
                {{ novel._count?.favorites || 0 }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <NuxtLink
              :to="`/author/novels/${novel.id}/edit`"
              class="p-2 hover:bg-white/10 rounded-lg transition"
              title="编辑"
            >
              <Icon name="ph:pencil" />
            </NuxtLink>
            <NuxtLink
              :to="`/author/novels/${novel.id}/chapters`"
              class="p-2 hover:bg-white/10 rounded-lg transition"
              title="章节管理"
            >
              <Icon name="ph:list" />
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'author',
  middleware: 'author'
})

const { user } = useAuth()
const toast = useToast()

const chartCanvas = ref<HTMLCanvasElement | null>(null)
const chartContainer = ref<HTMLDivElement | null>(null)

const { data, refresh } = await useFetch('/api/author/dashboard')
const novels = computed(() => data.value?.novels || [])
const summary = computed(() => data.value?.summary)
const weeklyTrend = computed(() => data.value?.weeklyTrend || [])

const defaultCover = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200'

const statusLabels: Record<string, string> = {
  ONGOING: '连载中',
  COMPLETED: '已完结',
  HIATUS: '暂停更新'
}

const formatNumber = (n: number) => {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

const drawChart = () => {
  const canvas = chartCanvas.value
  if (!canvas || !weeklyTrend.value.length) return

  const container = chartContainer.value
  if (!container) return

  const dpr = window.devicePixelRatio || 1
  const rect = container.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  canvas.style.width = rect.width + 'px'
  canvas.style.height = rect.height + 'px'

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, rect.width, rect.height)

  const padding = { top: 20, right: 20, bottom: 40, left: 50 }
  const chartW = rect.width - padding.left - padding.right
  const chartH = rect.height - padding.top - padding.bottom

  const data = weeklyTrend.value
  const maxValue = Math.max(
    ...data.map(d => Math.max(d.views || 0, d.favorites || 0, d.comments || 0)),
    1
  )

  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(padding.left + chartW, y)
    ctx.stroke()

    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'right'
    const val = Math.round(maxValue - (maxValue / 4) * i)
    ctx.fillText(val.toString(), padding.left - 8, y + 4)
  }

  const xStep = chartW / (data.length - 1)
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  data.forEach((d, i) => {
    const x = padding.left + xStep * i
    ctx.fillText(d.label || '', x, rect.height - padding.bottom + 20)
  })

  const drawLine = (
    key: 'views' | 'favorites' | 'comments',
    color: string
  ) => {
    const values = data.map(d => d[key] || 0)
    const points = values.map((v, i) => ({
      x: padding.left + xStep * i,
      y: padding.top + chartH - (v / maxValue) * chartH
    }))

    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH)
    gradient.addColorStop(0, color + '40')
    gradient.addColorStop(1, color + '00')

    ctx.beginPath()
    ctx.moveTo(points[0].x, padding.top + chartH)
    points.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.lineTo(points[points.length - 1].x, padding.top + chartH)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    points.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.stroke()

    points.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#0f0f1a'
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()
    })
  }

  drawLine('views', '#60a5fa')
  drawLine('favorites', '#f472b6')
  drawLine('comments', '#facc15')
}

watch([weeklyTrend, chartCanvas], () => {
  nextTick(() => {
    drawChart()
  })
}, { immediate: true })

onMounted(() => {
  window.addEventListener('resize', drawChart)
})

onUnmounted(() => {
  window.removeEventListener('resize', drawChart)
})

useHead({
  title: '作者中心 - 数据概览'
})
</script>
