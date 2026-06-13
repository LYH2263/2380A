<template>
  <div v-if="task" class="task-card border rounded-lg p-4 bg-white shadow-sm">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span class="text-lg">{{ getTypeIcon(task.type) }}</span>
        <span class="font-medium">{{ getTypeName(task.type) }}</span>
        <span
          :class="[
            'px-2 py-0.5 text-xs rounded-full',
            statusClass
          ]"
        >
          {{ getStatusName(task.status) }}
        </span>
      </div>
      <button
        v-if="task.status === 'PENDING' || task.status === 'PROCESSING'"
        @click="$emit('cancel', task.id)"
        class="text-xs text-red-500 hover:text-red-600"
      >
        取消
      </button>
    </div>

    <div v-if="task.status === 'PROCESSING' || task.status === 'PENDING'" class="mb-3">
      <div class="flex items-center justify-between text-sm text-gray-600 mb-1">
        <span>处理进度</span>
        <span>{{ task.progress }}%</span>
      </div>
      <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          class="h-full bg-blue-500 transition-all duration-300"
          :style="{ width: task.progress + '%' }"
        />
      </div>
      <div v-if="task.totalItems > 0" class="text-xs text-gray-500 mt-1">
        已处理 {{ task.processedItems }} / {{ task.totalItems }} 项
      </div>
    </div>

    <div v-if="task.status === 'FAILED'" class="mb-3 p-3 bg-red-50 text-red-700 rounded text-sm">
      <p class="font-medium">任务失败</p>
      <p>{{ task.errorMessage }}</p>
    </div>

    <div v-if="task.status === 'COMPLETED'" class="mb-3 p-3 bg-green-50 text-green-700 rounded text-sm">
      <p class="font-medium">任务完成</p>
      <div v-if="task.result?.summary" class="text-xs mt-1 space-y-0.5">
        <p v-if="task.result.summary.favorites !== undefined">收藏: {{ task.result.summary.favorites }} 条</p>
        <p v-if="task.result.summary.readHistory !== undefined">阅读历史: {{ task.result.summary.readHistory }} 条</p>
        <p v-if="task.result.summary.comments !== undefined">评论: {{ task.result.summary.comments }} 条</p>
        <p v-if="task.result.summary.ratings !== undefined">评分: {{ task.result.summary.ratings }} 条</p>
      </div>
      <div v-if="task.result?.report" class="text-xs mt-1 space-y-0.5">
        <p>总计: {{ task.result.report.totalRows }} 行</p>
        <p>成功创建: {{ task.result.report.createdRows }} 条</p>
        <p>成功更新: {{ task.result.report.updatedRows }} 条</p>
        <p v-if="task.result.report.failedRows > 0">失败: {{ task.result.report.failedRows }} 行</p>
      </div>
      <div v-if="task.result?.novelTitle" class="text-xs mt-1 space-y-0.5">
        <p>已恢复小说: {{ task.result.novelTitle }}</p>
        <p v-if="task.result.chapterCount">章节数: {{ task.result.chapterCount }}</p>
        <p v-if="task.result.commentCount">评论数: {{ task.result.commentCount }}</p>
      </div>
    </div>

    <div class="flex items-center justify-between text-sm">
      <div class="text-gray-500 text-xs">
        <span>创建: {{ formatDate(task.createdAt) }}</span>
        <span v-if="task.completedAt" class="ml-3">完成: {{ formatDate(task.completedAt) }}</span>
        <span v-if="task.fileSize" class="ml-3">大小: {{ formatSize(task.fileSize) }}</span>
      </div>
      <a
        v-if="task.status === 'COMPLETED' && task.downloadUrl"
        :href="task.downloadUrl"
        class="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
      >
        下载文件
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface TaskItem {
  id: number
  type: string
  status: string
  progress: number
  totalItems: number
  processedItems: number
  fileName: string
  fileSize: number
  downloadUrl: string
  errorMessage: string
  result: any
  createdAt: string
  completedAt: string
  expiresAt?: string
}

const props = defineProps<{ task: TaskItem }>()
defineEmits(['cancel'])

const statusClass = computed(() => {
  const map: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-600',
    PROCESSING: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-yellow-100 text-yellow-700'
  }
  return map[props.task.status] || map.PENDING
})

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
  const map: Record<string, string> = {
    USER_DATA_EXPORT: '用户数据导出',
    ADMIN_NOVEL_EXPORT: '小说列表导出',
    ADMIN_USER_EXPORT: '用户列表导出',
    ADMIN_COMMENT_EXPORT: '评论列表导出',
    ADMIN_NOVEL_IMPORT: '小说批量导入',
    NOVEL_BACKUP: '小说备份',
    NOVEL_RESTORE: '小说恢复'
  }
  return map[type] || type
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

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatSize(bytes: number): string {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>
