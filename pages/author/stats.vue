<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2">数据统计</h1>
      <p class="text-white/60">查看您的作品数据和读者留存分析</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="card p-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-white/60 text-sm">总阅读量</span>
          <Icon name="ph:eye" class="text-green-400" />
        </div>
        <p class="text-3xl font-bold">{{ formatNumber(summary?.totalViews || 0) }}</p>
      </div>

      <div class="card p-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-white/60 text-sm">总收藏数</span>
          <Icon name="ph:heart" class="text-pink-400" />
        </div>
        <p class="text-3xl font-bold">{{ formatNumber(summary?.totalFavorites || 0) }}</p>
      </div>

      <div class="card p-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-white/60 text-sm">章节总数</span>
          <Icon name="ph:file-text" class="text-blue-400" />
        </div>
        <p class="text-3xl font-bold">{{ summary?.totalChapters || 0 }}</p>
      </div>

      <div class="card p-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-white/60 text-sm">平均留存率</span>
          <Icon name="ph:users-three" class="text-purple-400" />
        </div>
        <p class="text-3xl font-bold">{{ summary?.avgRetentionRate || 0 }}%</p>
      </div>
    </div>

    <div class="card p-6 mb-8">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold">整体趋势（近 {{ days }} 天）</h2>
        <div class="flex items-center gap-2">
          <select v-model="days" class="input-field text-sm py-1.5 px-3">
            <option :value="7">近7天</option>
            <option :value="14">近14天</option>
            <option :value="30">近30天</option>
            <option :value="60">近60天</option>
          </select>
        </div>
      </div>

      <div ref="trendChartContainer" class="relative h-72 w-full">
        <canvas ref="trendChartCanvas" class="w-full h-full"></canvas>
      </div>
    </div>

    <div class="card overflow-hidden">
      <div class="p-6 border-b border-white/10">
        <h2 class="text-xl font-bold">各作品详细数据</h2>
      </div>

      <div v-if="!novels.length" class="p-12 text-center text-white/50">
        <Icon name="ph:chart-bar" class="text-4xl mb-4" />
        <p>暂无数据</p>
      </div>

      <div v-else class="divide-y divide-white/10">
        <div
          v-for="novel in novels"
          :key="novel.id"
          class="p-6 hover:bg-white/5 transition"
        >
          <div class="flex items-start gap-4 mb-4">
            <img
              :src="novel.cover || defaultCover"
              :alt="novel.title"
              class="w-16 h-20 object-cover rounded flex-shrink-0"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="font-semibold text-lg truncate">{{ novel.title }}</h3>
                <span :class="[
                  'px-2 py-0.5 rounded text-xs',
                  novel.status === 'ONGOING' ? 'bg-green-500/20 text-green-400' :
                  novel.status === 'COMPLETED' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-yellow-500/20 text-yellow-400'
                ]">
                  {{ statusLabels[novel.status] }}
                </span>
              </div>

              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                <div class="bg-white/5 rounded-lg p-3">
                  <p class="text-xs text-white/50 mb-1">阅读量</p>
                  <p class="font-semibold">{{ formatNumber(novel.viewCount) }}</p>
                </div>
                <div class="bg-white/5 rounded-lg p-3">
                  <p class="text-xs text-white/50 mb-1">收藏数</p>
                  <p class="font-semibold">{{ novel._count?.favorites || 0 }}</p>
                </div>
                <div class="bg-white/5 rounded-lg p-3">
                  <p class="text-xs text-white/50 mb-1">章节数</p>
                  <p class="font-semibold">{{ novel.chapterCount || 0 }}</p>
                </div>
                <div class="bg-white/5 rounded-lg p-3">
                  <p class="text-xs text-white/50 mb-1">留存率</p>
                  <p class="font-semibold flex items-center gap-1">
                    {{ novel.retentionRate }}%
                    <span v-if="novel.retentionRate >= 60" class="text-green-400">
                      <Icon name="ph:arrow-up" class="w-3 h-3" />
                    </span>
                    <span v-else-if="novel.retentionRate >= 30" class="text-yellow-400">
                      <Icon name="ph:minus" class="w-3 h-3" />
                    </span>
                    <span v-else class="text-red-400">
                      <Icon name="ph:arrow-down" class="w-3 h-3" />
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <details class="mt-4">
            <summary class="cursor-pointer text-sm text-neuro-primary hover:underline">
              查看章节数据对比和每日趋势 →
            </summary>

            <div class="mt-4 space-y-6">
              <div>
                <h4 class="text-sm font-medium text-white/70 mb-3">章节阅读对比</h4>
                <div class="max-h-64 overflow-auto border border-white/10 rounded-lg">
                  <table class="w-full text-sm">
                    <thead class="bg-white/5 sticky top-0">
                      <tr>
                        <th class="px-4 py-2 text-left text-white/60 font-medium">章节</th>
                        <th class="px-4 py-2 text-right text-white/60 font-medium">字数</th>
                        <th class="px-4 py-2 text-right text-white/60 font-medium">开始阅读</th>
                        <th class="px-4 py-2 text-right text-white/60 font-medium">读完</th>
                        <th class="px-4 py-2 text-right text-white/60 font-medium">留存率</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">
                      <tr v-for="ch in novel.chapters.slice(0, 30)" :key="ch.id" class="hover:bg-white/5">
                        <td class="px-4 py-2 truncate max-w-xs" :title="ch.title">
                          第{{ ch.order }}章 · {{ ch.title }}
                        </td>
                        <td class="px-4 py-2 text-right text-white/70">{{ ch.wordCount }}</td>
                        <td class="px-4 py-2 text-right text-white/70">{{ ch.viewCount }}</td>
                        <td class="px-4 py-2 text-right text-white/70">{{ ch.finishCount }}</td>
                        <td class="px-4 py-2 text-right">
                          <span :class="ch.readCount >= 10 ? (
                            (ch.finishCount / ch.readCount) >= 0.6 ? 'text-green-400' :
                            (ch.finishCount / ch.readCount) >= 0.3 ? 'text-yellow-400' : 'text-red-400'
                          ) : 'text-white/50'">
                            {{ ch.readCount > 0 ? Math.round((ch.finishCount / ch.readCount) * 100) : 0 }}%
                          </span>
                        </td>
                      </tr>
                      <tr v-if="!novel.chapters.length">
                        <td colspan="5" class="px-4 py-8 text-center text-white/40">暂无章节数据</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 class="text-sm font-medium text-white/70 mb-3">每日阅读趋势</h4>
                <div class="h-48 bg-white/5 rounded-lg p-4" :ref="(el: any) => setMiniChartRef(novel.id, el)">
                  <canvas :ref="(el: any) => setMiniCanvasRef(novel.id, el)" class="w-full h-full"></canvas>
                </div>
              </div>
            </div>
          </details>
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

const days = ref(30)
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

const trendChartCanvas = ref<HTMLCanvasElement | null>(null)
const trendChartContainer = ref<HTMLDivElement | null>(null)

const miniChartContainers = reactive<Record<number, HTMLDivElement | null>>({})
const miniChartCanvases = reactive<Record<number, HTMLCanvasElement | null>>({})

const setMiniChartRef = (id: number, el: any) => {
  if (el) miniChartContainers[id] = el
}
const setMiniCanvasRef = (id: number, el: any) => {
  if (el) miniChartCanvases[id] = el
}

const { data, refresh } = await useFetch('/api/author/stats', {
  query: computed(() => ({ days: days.value }))
})

const summary = computed(() => data.value?.summary)
const dailyTrend = computed(() => data.value?.dailyTrend || [])
const novels = computed(() => data.value?.novels || [])

watch(days, () => refresh())

const drawLineChart = (
  canvas: HTMLCanvasElement,
  container: HTMLDivElement,
  datasets: Array<{ label: string; color: string; data: number[] }>,
  labels: string[]
) => {
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

  const padding = { top: 10, right: 10, bottom: 24, left: 36 }
  const w = rect.width - padding.left - padding.right
  const h = rect.height - padding.top - padding.bottom

  const allValues = datasets.flatMap(d => d.data)
  const maxVal = Math.max(...allValues, 1)

  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 3; i++) {
    const y = padding.top + (h / 3) * i
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(padding.left + w, y)
    ctx.stroke()
  }

  const stepX = labels.length > 1 ? w / (labels.length - 1) : w

  labels.forEach((label, i) => {
    if (i % Math.ceil(labels.length / 7) === 0 || i === labels.length - 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(label, padding.left + stepX * i, rect.height - 6)
    }
  })

  datasets.forEach(ds => {
    const points = ds.data.map((v, i) => ({
      x: padding.left + stepX * i,
      y: padding.top + h - (v / maxVal) * h
    }))

    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + h)
    gradient.addColorStop(0, ds.color + '30')
    gradient.addColorStop(1, ds.color + '00')
    ctx.beginPath()
    ctx.moveTo(points[0]?.x || padding.left, padding.top + h)
    points.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.lineTo(points[points.length - 1]?.x || padding.left + w, padding.top + h)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.beginPath()
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    ctx.strokeStyle = ds.color
    ctx.lineWidth = 2
    ctx.stroke()
  })
}

watch([dailyTrend, trendChartCanvas, trendChartContainer], () => {
  nextTick(() => {
    if (trendChartCanvas.value && trendChartContainer.value && dailyTrend.value.length) {
      drawLineChart(
        trendChartCanvas.value,
        trendChartContainer.value,
        [
          { label: '阅读量', color: '#60a5fa', data: dailyTrend.value.map(d => d.views || 0) },
          { label: '收藏数', color: '#f472b6', data: dailyTrend.value.map(d => d.favorites || 0) },
          { label: '评论数', color: '#facc15', data: dailyTrend.value.map(d => d.comments || 0) }
        ],
        dailyTrend.value.map(d => {
          const dt = new Date(d.date)
          return `${dt.getMonth() + 1}/${dt.getDate()}`
        })
      )
    }
  })
}, { immediate: true, deep: true })

watch(() => novels.value, (novelList) => {
  nextTick(() => {
    novelList.forEach(novel => {
      const canvas = miniChartCanvases[novel.id]
      const container = miniChartContainers[novel.id]
      if (canvas && container && novel.dailyTrend?.length) {
        drawLineChart(
          canvas,
          container,
          [
            { label: '阅读', color: '#60a5fa', data: novel.dailyTrend.map((d: any) => d.views || 0) },
            { label: '评论', color: '#facc15', data: novel.dailyTrend.map((d: any) => d.comments || 0) }
          ],
          novel.dailyTrend.map((d: any) => {
            const dt = new Date(d.date)
            return `${dt.getMonth() + 1}/${dt.getDate()}`
          })
        )
      }
    })
  })
}, { immediate: true, deep: true })

onMounted(() => {
  window.addEventListener('resize', () => {
    if (trendChartCanvas.value && trendChartContainer.value && dailyTrend.value.length) {
      drawLineChart(
        trendChartCanvas.value,
        trendChartContainer.value,
        [
          { label: '阅读量', color: '#60a5fa', data: dailyTrend.value.map(d => d.views || 0) },
          { label: '收藏数', color: '#f472b6', data: dailyTrend.value.map(d => d.favorites || 0) },
          { label: '评论数', color: '#facc15', data: dailyTrend.value.map(d => d.comments || 0) }
        ],
        dailyTrend.value.map(d => {
          const dt = new Date(d.date)
          return `${dt.getMonth() + 1}/${dt.getDate()}`
        })
      )
    }
  })
})

useHead({
  title: '数据统计 - 作者中心'
})
</script>
