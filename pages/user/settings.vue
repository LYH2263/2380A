<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-4xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold mb-6">账户设置</h1>

      <div class="grid gap-6">
        <!-- 数据导出 -->
        <section class="bg-white rounded-xl shadow-sm p-6">
          <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📤</span> 我的数据导出
          </h2>
          <p class="text-gray-600 text-sm mb-4">
            导出您的所有数据为 JSON 格式，包括收藏列表、阅读历史、评论记录、评分记录。
            导出将在后台进行，完成后可在此处下载。
          </p>
          <button
            @click="handleExport"
            :disabled="exporting"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {{ exporting ? '正在创建任务...' : '开始导出我的数据' }}
          </button>
        </section>

        <!-- 我的任务 -->
        <section class="bg-white rounded-xl shadow-sm p-6">
          <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📋</span> 我的任务
          </h2>
          <div v-if="tasks.length === 0" class="text-gray-500 text-sm py-8 text-center">
            暂无任务记录
          </div>
          <div v-else class="space-y-3">
            <TaskProgressCard
              v-for="task in tasks"
              :key="task.id"
              :task="task"
              @cancel="handleCancelTask"
            />
          </div>
        </section>

        <!-- 我的分享 -->
        <section class="bg-white rounded-xl shadow-sm p-6">
          <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🔗</span> 我的分享链接
          </h2>
          <div v-if="shares.length === 0" class="text-gray-500 text-sm py-8 text-center">
            暂无分享记录，您可以在书架或书单页面创建分享链接
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="share in shares"
              :key="share.id"
              class="border rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-lg">{{ getShareTypeIcon(share.type) }}</span>
                    <span class="font-medium truncate">{{ share.title }}</span>
                    <span
                      :class="[
                        'px-2 py-0.5 text-xs rounded-full',
                        share.isExpired ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'
                      ]"
                    >
                      {{ share.isExpired ? '已失效' : '有效' }}
                    </span>
                  </div>
                  <p v-if="share.description" class="text-sm text-gray-500 mb-2 truncate">
                    {{ share.description }}
                  </p>
                  <div class="flex items-center gap-2 text-xs text-gray-400">
                    <span>🔗 <a :href="share.shareUrl" target="_blank" class="text-blue-500 hover:underline">查看分享</a></span>
                    <span>👁 {{ share.viewCount }}</span>
                    <span v-if="share.expiresAt">⏰ {{ formatDate(share.expiresAt) }} 过期</span>
                  </div>
                </div>
                <button
                  @click="copyShareUrl(share.shareUrl)"
                  class="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                >
                  复制链接
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TaskProgressCard from '~/components/TaskProgressCard.vue'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'

const { user } = useAuth()
const toast = useToast()

const exporting = ref(false)
const tasks = ref<any[]>([])
const shares = ref<any[]>([])

interface ShareItem {
  id: number
  type: string
  shareUrl: string
}

async function fetchData() {
  const [{ data: tasksData }, { data: sharesData }] = await Promise.all([
    useFetch('/api/user/tasks'),
    useFetch('/api/user/shares')
  ])
  tasks.value = tasksData.value?.tasks || []
  shares.value = sharesData.value?.shares || []
}

async function handleExport() {
  exporting.value = true
  try {
    const { data, error } = await useFetch('/api/user/export', { method: 'POST' })
    if (error.value) {
      toast.show(error.value.data?.message || '创建导出任务失败', 'error')
      return
    }
    toast.show('导出任务已创建，请在下方查看进度', 'success')
    await fetchData()
  } finally {
    exporting.value = false
  }
}

async function handleCancelTask(taskId: number) {
  const { error } = await useFetch(`/api/tasks/${taskId}/cancel`, { method: 'POST' })
  if (error.value) {
    toast.show(error.value.data?.message || '取消失败', 'error')
    return
  }
  toast.show('任务已取消', 'success')
  await fetchData()
}

function copyShareUrl(url: string) {
  const fullUrl = window.location.origin + url
  navigator.clipboard.writeText(fullUrl).then(() => {
    toast.show('链接已复制到剪贴板', 'success')
  }).catch(() => {
    toast.show('复制失败，请手动复制', 'error')
  })
}

function getShareTypeIcon(type: string): string {
  return type === 'BOOKSHELF' ? '📚' : '📖'
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

definePageMeta({
  middleware: 'auth'
})

onMounted(() => {
  fetchData()
  const interval = setInterval(() => {
    const hasPending = tasks.value.some(t => t.status === 'PENDING' || t.status === 'PROCESSING')
    if (hasPending) {
      fetchData()
    } else {
      clearInterval(interval)
    }
  }, 3000)
  onBeforeUnmount(() => clearInterval(interval))
})
</script>
