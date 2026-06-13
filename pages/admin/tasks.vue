<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">任务中心</h1>
      <button
        @click="loadTasks"
        class="btn-secondary"
      >
        <Icon name="ph:arrow-clockwise" class="mr-2" />
        刷新
      </button>
    </div>

    <!-- 筛选栏 -->
    <div class="card p-4 mb-6">
      <div class="flex flex-wrap gap-4 items-end">
        <div>
          <label class="block text-sm text-white/60 mb-1">任务类型</label>
          <select v-model="filterType" class="input-field text-sm py-2">
            <option value="">全部类型</option>
            <option v-for="(label, key) in typeLabels" :key="key" :value="key">
              {{ label }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-white/60 mb-1">状态</label>
          <select v-model="filterStatus" class="input-field text-sm py-2">
            <option value="">全部状态</option>
            <option value="PENDING">等待中</option>
            <option value="PROCESSING">处理中</option>
            <option value="COMPLETED">已完成</option>
            <option value="FAILED">失败</option>
            <option value="CANCELLED">已取消</option>
          </select>
        </div>
        <button @click="resetFilters" class="btn-secondary text-sm py-2">
          重置筛选
        </button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="card p-4">
        <p class="text-white/60 text-sm">等待中</p>
        <p class="text-2xl font-bold text-yellow-400">{{ countByStatus('PENDING') }}</p>
      </div>
      <div class="card p-4">
        <p class="text-white/60 text-sm">处理中</p>
        <p class="text-2xl font-bold text-blue-400">{{ countByStatus('PROCESSING') }}</p>
      </div>
      <div class="card p-4">
        <p class="text-white/60 text-sm">已完成</p>
        <p class="text-2xl font-bold text-green-400">{{ countByStatus('COMPLETED') }}</p>
      </div>
      <div class="card p-4">
        <p class="text-white/60 text-sm">失败</p>
        <p class="text-2xl font-bold text-red-400">{{ countByStatus('FAILED') }}</p>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="space-y-3">
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-10 w-10 border-4 border-white/20 border-t-neuro-primary" />
      </div>

      <div v-else-if="filteredTasks.length === 0" class="card p-12 text-center text-white/50">
        <Icon name="ph:inbox" class="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>暂无任务记录</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="card p-4"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-2 flex-wrap">
                <span class="text-xl">{{ getTypeIcon(task.type) }}</span>
                <span class="font-medium">{{ getTypeName(task.type) }}</span>
                <span
                  :class="[
                    'px-2 py-0.5 text-xs rounded-full',
                    getStatusClass(task.status)
                  ]"
                >
                  {{ getStatusName(task.status) }}
                </span>
                <span class="text-xs text-white/50">#{{ task.id }}</span>
                <span v-if="task.username" class="text-xs text-white/50">
                  发起用户: {{ task.username }}
                </span>
              </div>

              <!-- 进度条 -->
              <div v-if="task.status === 'PROCESSING' || task.status === 'PENDING'" class="mb-3">
                <div class="flex justify-between text-xs text-white/60 mb-1">
                  <span>进度</span>
                  <span>{{ task.progress }}%</span>
                </div>
                <div class="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-neuro-primary transition-all duration-300"
                    :style="{ width: task.progress + '%' }"
                  />
                </div>
                <div v-if="task.totalItems > 0" class="text-xs text-white/50 mt-1">
                  {{ task.processedItems }} / {{ task.totalItems }} 项
                </div>
              </div>

              <!-- 错误信息 -->
              <div v-if="task.status === 'FAILED' && task.errorMessage" class="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
                {{ task.errorMessage }}
              </div>

              <!-- 结果信息 -->
              <div v-if="task.result" class="mb-3 p-3 bg-white/5 rounded text-sm space-y-1">
                <div v-if="task.result.report?.createdRows !== undefined">
                  创建 <span class="text-green-400 font-medium">{{ task.result.report.createdRows }}</span> 条
                  · 更新 <span class="text-blue-400 font-medium">{{ task.result.report.updatedRows }}</span> 条
                  · 失败 <span class="text-red-400 font-medium">{{ task.result.report.failedRows }}</span> 条
                </div>
                <div v-else-if="task.result.summary">
                  收藏: {{ task.result.summary.favorites }}
                  · 历史: {{ task.result.summary.readHistory }}
                  · 评论: {{ task.result.summary.comments }}
                  · 评分: {{ task.result.summary.ratings }}
                </div>
                <div v-else-if="task.result.backupId">
                  备份 ID: #{{ task.result.backupId }}
                </div>
                <div v-else-if="task.result.novelTitle">
                  已恢复: <span class="text-blue-400">{{ task.result.novelTitle }}</span>
                  ({{ task.result.chapterCount }} 章节, {{ task.result.commentCount }} 评论)
                </div>
                <div v-else-if="task.result.totalRows">
                  共导出 {{ task.result.totalRows }} 行
                </div>
              </div>

              <div class="text-xs text-white/50 flex flex-wrap gap-x-4 gap-y-1">
                <span>创建: {{ formatDate(task.createdAt) }}</span>
                <span v-if="task.completedAt">完成: {{ formatDate(task.completedAt) }}</span>
                <span v-if="task.fileName">文件: {{ task.fileName }}</span>
                <span v-if="task.fileSize">大小: {{ formatSize(task.fileSize) }}</span>
              </div>
            </div>

            <div class="flex flex-col gap-2 flex-shrink-0">
              <a
                v-if="task.status === 'COMPLETED' && task.downloadUrl"
                :href="task.downloadUrl"
                class="btn-primary text-sm px-4 py-2 whitespace-nowrap"
              >
                <Icon name="ph:download-simple" class="mr-1" />
                下载
              </a>
              <button
                v-if="task.status === 'PENDING' || task.status === 'PROCESSING'"
                @click="cancelTask(task.id)"
                class="btn-secondary text-sm px-4 py-2 whitespace-nowrap"
              >
                <Icon name="ph:x-circle" class="mr-1" />
                取消
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

const typeLabels: Record<string, string> = {
  USER_DATA_EXPORT: '用户数据导出',
  ADMIN_NOVEL_EXPORT: '小说列表导出',
  ADMIN_USER_EXPORT: '用户列表导出',
  ADMIN_COMMENT_EXPORT: '评论列表导出',
  ADMIN_NOVEL_IMPORT: '小说批量导入',
  NOVEL_BACKUP: '小说备份',
  NOVEL_RESTORE: '小说恢复'
}

const filterType = ref('')
const filterStatus = ref('')
const loading = ref(false)
const tasks = ref<any[]>([])

const filteredTasks = computed(() => {
  return tasks.value.filter(t => {
    if (filterType.value && t.type !== filterType.value) return false
    if (filterStatus.value && t.status !== filterStatus.value) return false
    return true
  })
})

function countByStatus(status: string): number {
  return tasks.value.filter(t => t.status === status).length
}

function resetFilters() {
  filterType.value = ''
  filterStatus.value = ''
}

function getTypeIcon(type: string): string {
  const map: Record<string, string> = {
    USER_DATA_EXPORT: '📤',
    ADMIN_NOVEL_EXPORT: '📊',
    ADMIN_USER_EXPORT: '👥',
    ADMIN_COMMENT_EXPORT: '💬',
    ADMIN_NOVEL_IMPORT: '📥',
    NOVEL_BACKUP: '💾',
    NOVEL_RESTORE: '🔄'
  }
  return map[type] || '📄'
}

function getTypeName(type: string): string {
  return typeLabels[type] || type
}

function getStatusName(status: string): string {
  const map: Record<string, string> = {
    PENDING: '等待中',
    PROCESSING: '处理中',
    COMPLETED: '已完成',
    FAILED: '失败',
    CANCELLED: '已取消'
  }
  return map[status] || status
}

function getStatusClass(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-400/20 text-yellow-400',
    PROCESSING: 'bg-blue-400/20 text-blue-400',
    COMPLETED: 'bg-green-400/20 text-green-400',
    FAILED: 'bg-red-400/20 text-red-400',
    CANCELLED: 'bg-gray-400/20 text-gray-400'
  }
  return map[status] || map.PENDING
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

function formatSize(bytes: number): string {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function loadTasks() {
  loading.value = true
  try {
    const { data } = await useFetch('/api/admin/tasks', {
      query: { pageSize: 100 },
      params: computed(() => ({
        type: filterType.value || undefined,
        status: filterStatus.value || undefined
      }))
    })
    tasks.value = data.value?.tasks || []
  } finally {
    loading.value = false
  }
}

async function cancelTask(taskId: number) {
  if (!confirm('确定要取消这个任务吗？')) return
  const { error } = await useFetch(`/api/tasks/${taskId}/cancel`, { method: 'POST' })
  if (error.value) {
    alert(error.value.data?.message || '取消失败')
    return
  }
  await loadTasks()
}

useHead({ title: '任务中心 - 管理后台' })

let refreshInterval: any = null
onMounted(() => {
  loadTasks()
  refreshInterval = setInterval(() => {
    const hasActive = tasks.value.some(t => t.status === 'PENDING' || t.status === 'PROCESSING')
    if (hasActive) loadTasks()
  }, 3000)
})
onBeforeUnmount(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})
watch([filterType, filterStatus], loadTasks)
</script>
