<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-3xl font-bold">审核状态</h1>
    </div>

    <!-- Tabs -->
    <div class="flex items-center gap-2 mb-6">
      <button
        @click="activeTab = 'status'"
        :class="[
          'px-6 py-3 rounded-lg font-medium transition',
          activeTab === 'status'
            ? 'bg-white/10 text-white'
            : 'text-white/60 hover:bg-white/5'
        ]"
      >
        审核中的内容
      </button>
      <button
        @click="activeTab = 'history'"
        :class="[
          'px-6 py-3 rounded-lg font-medium transition',
          activeTab === 'history'
            ? 'bg-white/10 text-white'
            : 'text-white/60 hover:bg-white/5'
        ]"
      >
        审核历史
      </button>
    </div>

    <!-- Content Type Filter -->
    <div v-if="activeTab === 'status'" class="flex items-center gap-4 mb-6">
      <div class="flex items-center gap-2">
        <button
          v-for="opt in contentTypeOptions"
          :key="opt.value"
          @click="contentType = opt.value"
          :class="[
            'px-4 py-2 rounded-lg text-sm transition',
            contentType === opt.value
              ? 'bg-white/10 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          ]"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Review Status List -->
    <div v-if="activeTab === 'status'" class="card overflow-hidden">
      <div v-if="loading" class="p-12 text-center">
        <Icon name="ph:spinner" class="text-4xl animate-spin text-neuro-primary" />
        <p class="mt-4 text-white/50">加载中...</p>
      </div>

      <div v-else-if="!items.length" class="p-12 text-center text-white/50">
        <Icon name="ph:check-circle" class="text-4xl mb-4" />
        <p>暂无审核中的内容</p>
      </div>

      <div v-else class="divide-y divide-white/10">
        <div
          v-for="item in items"
          :key="`${item.contentType}-${item.id}`"
          class="p-6 hover:bg-white/5 transition"
        >
          <div class="flex items-start justify-between gap-6">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-3">
                <span :class="['px-2 py-1 rounded text-xs font-medium', contentTypeClasses[item.contentType]]">
                  {{ contentTypeLabels[item.contentType] }}
                </span>
                <span :class="['px-2 py-1 rounded text-xs font-medium', statusClasses[item.reviewStatus]]">
                  {{ statusLabels[item.reviewStatus] }}
                </span>
              </div>

              <h3 class="text-lg font-medium mb-2">
                <template v-if="item.contentType === 'NOVEL'">
                  {{ item.title }}
                </template>
                <template v-else-if="item.contentType === 'CHAPTER'">
                  {{ item.novel?.title }} - {{ item.title }}
                </template>
              </h3>

              <p class="text-white/70 text-sm mb-3 line-clamp-2">
                <template v-if="item.contentType === 'NOVEL'">
                  {{ item.description }}
                </template>
                <template v-else-if="item.contentType === 'CHAPTER'">
                  {{ item.content?.slice(0, 200) }}...
                </template>
              </p>

              <div class="flex items-center gap-4 text-sm text-white/50">
                <span>提交于 {{ formatDate(item.submittedAt) }}</span>
                <span v-if="item.updatedAt && item.updatedAt !== item.submittedAt">
                  更新于 {{ formatDate(item.updatedAt) }}
                </span>
              </div>

              <div v-if="item.rejectionReason" class="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p class="text-sm text-red-400">
                  <span class="font-medium">拒绝理由：</span>{{ item.rejectionReason }}
                </p>
              </div>

              <div v-if="item.reviewStatus === 'NEEDS_REVISION'" class="mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <p class="text-sm text-orange-400">
                  <span class="font-medium">修改意见：</span>{{ item.rejectionReason || '请根据审核意见修改后重新提交' }}
                </p>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <NuxtLink
                v-if="item.contentType === 'NOVEL'"
                :to="`/author/novels/${item.id}/edit`"
                class="btn-primary px-4 py-2 text-sm text-center"
              >
                <Icon name="ph:pencil" class="mr-1" />
                编辑
              </NuxtLink>
              <NuxtLink
                v-else-if="item.contentType === 'CHAPTER'"
                :to="`/author/novels/${item.novelId}/chapters`"
                class="btn-primary px-4 py-2 text-sm text-center"
              >
                <Icon name="ph:pencil" class="mr-1" />
                编辑章节
              </NuxtLink>
              <button
                v-if="item.reviewStatus === 'REJECTED' || item.reviewStatus === 'NEEDS_REVISION'"
                @click="handleResubmit(item)"
                :loading="resubmitLoading[`${item.contentType}-${item.id}`]"
                class="btn-secondary px-4 py-2 text-sm"
              >
                <Icon name="ph:arrow-clockwise" class="mr-1" />
                重新提交
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="pagination && pagination.totalPages > 1" class="p-4 border-t border-white/10 flex justify-center gap-2">
        <button
          @click="page--"
          :disabled="page <= 1 || loading"
          class="btn-secondary px-3 py-1 disabled:opacity-50"
        >
          上一页
        </button>
        <span class="px-4 py-1 text-white/70">
          {{ page }} / {{ pagination.totalPages }}
        </span>
        <button
          @click="page++"
          :disabled="page >= pagination.totalPages || loading"
          class="btn-secondary px-3 py-1 disabled:opacity-50"
        >
          下一页
        </button>
      </div>
    </div>

    <!-- Review History -->
    <div v-if="activeTab === 'history'" class="card overflow-hidden">
      <div v-if="historyLoading" class="p-12 text-center">
        <Icon name="ph:spinner" class="text-4xl animate-spin text-neuro-primary" />
        <p class="mt-4 text-white/50">加载中...</p>
      </div>

      <div v-else-if="!records.length" class="p-12 text-center text-white/50">
        <Icon name="ph:clock" class="text-4xl mb-4" />
        <p>暂无审核记录</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-white/5">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">内容类型</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">内容标题</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">操作</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">审核人</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">备注</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">时间</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr v-for="record in records" :key="record.id" class="hover:bg-white/5 transition">
              <td class="px-6 py-4">
                <span :class="['px-2 py-1 rounded text-xs font-medium', contentTypeClasses[record.contentType]]">
                  {{ contentTypeLabels[record.contentType] }}
                </span>
              </td>
              <td class="px-6 py-4 text-white/90">
                <template v-if="record.novel">{{ record.novel.title }}</template>
                <template v-else-if="record.chapter">{{ record.chapter.title }}</template>
              </td>
              <td class="px-6 py-4">
                <span :class="['px-2 py-1 rounded text-xs font-medium', actionClasses[record.action]]">
                  {{ actionLabels[record.action] }}
                </span>
              </td>
              <td class="px-6 py-4 text-white/70">
                <div class="flex items-center gap-2">
                  <img
                    :src="record.reviewer?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'"
                    :alt="record.reviewer?.username"
                    class="w-6 h-6 rounded-full"
                  />
                  <span>{{ record.reviewer?.username }}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-white/70 max-w-xs truncate" :title="record.remark || ''">
                {{ record.remark || '-' }}
              </td>
              <td class="px-6 py-4 text-white/50 text-sm">
                {{ formatDate(record.createdAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="historyPagination && historyPagination.totalPages > 1" class="p-4 border-t border-white/10 flex justify-center gap-2">
        <button
          @click="historyPage--"
          :disabled="historyPage <= 1 || historyLoading"
          class="btn-secondary px-3 py-1 disabled:opacity-50"
        >
          上一页
        </button>
        <span class="px-4 py-1 text-white/70">
          {{ historyPage }} / {{ historyPagination.totalPages }}
        </span>
        <button
          @click="historyPage++"
          :disabled="historyPage >= historyPagination.totalPages || historyLoading"
          class="btn-secondary px-3 py-1 disabled:opacity-50"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'author',
  middleware: 'author'
})

const toast = useToast()

const activeTab = ref<'status' | 'history'>('status')
const contentType = ref('')
const page = ref(1)
const historyPage = ref(1)
const loading = ref(false)
const historyLoading = ref(false)
const resubmitLoading = ref<Record<string, boolean>>({})

const items = ref<any[]>([])
const pagination = ref<any>(null)
const records = ref<any[]>([])
const historyPagination = ref<any>(null)

const contentTypeOptions = [
  { label: '全部', value: '' },
  { label: '小说', value: 'NOVEL' },
  { label: '章节', value: 'CHAPTER' }
]

const contentTypeLabels: Record<string, string> = {
  NOVEL: '小说',
  CHAPTER: '章节',
  COMMENT: '评论'
}

const contentTypeClasses: Record<string, string> = {
  NOVEL: 'bg-purple-500/20 text-purple-400',
  CHAPTER: 'bg-blue-500/20 text-blue-400',
  COMMENT: 'bg-green-500/20 text-green-400'
}

const statusLabels: Record<string, string> = {
  DRAFT: '草稿',
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  NEEDS_REVISION: '待修改'
}

const statusClasses: Record<string, string> = {
  DRAFT: 'bg-gray-500/20 text-gray-400',
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  APPROVED: 'bg-green-500/20 text-green-400',
  REJECTED: 'bg-red-500/20 text-red-400',
  NEEDS_REVISION: 'bg-orange-500/20 text-orange-400'
}

const actionLabels: Record<string, string> = {
  APPROVE: '通过',
  REJECT: '拒绝',
  NEEDS_REVISION: '需修改'
}

const actionClasses: Record<string, string> = {
  APPROVE: 'bg-green-500/20 text-green-400',
  REJECT: 'bg-red-500/20 text-red-400',
  NEEDS_REVISION: 'bg-orange-500/20 text-orange-400'
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const fetchStatus = async () => {
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      limit: 10
    }
    if (contentType.value) params.contentType = contentType.value

    const data = await $fetch('/api/author/review-status', { query: params })
    items.value = data.items || []
    pagination.value = data.pagination || null
  } catch (e: any) {
    toast.error(e.data?.message || e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const fetchHistory = async () => {
  historyLoading.value = true
  try {
    const data = await $fetch('/api/author/review-history', {
      query: { page: historyPage.value, limit: 20 }
    })
    records.value = data.records || []
    historyPagination.value = data.pagination || null
  } catch (e: any) {
    toast.error(e.data?.message || e.message || '加载失败')
  } finally {
    historyLoading.value = false
  }
}

const handleResubmit = async (item: any) => {
  const key = `${item.contentType}-${item.id}`
  resubmitLoading.value[key] = true
  try {
    let url = ''
    if (item.contentType === 'NOVEL') {
      url = `/api/author/novels/${item.id}/submit-review`
    } else if (item.contentType === 'CHAPTER') {
      url = `/api/author/novels/${item.novelId}/chapters/${item.id}/submit-review`
    }

    const result: any = await $fetch(url, { method: 'POST' })
    toast.success(result.warning || '已重新提交审核')
    fetchStatus()
  } catch (e: any) {
    toast.error(e.data?.message || e.message || '提交失败')
  } finally {
    resubmitLoading.value[key] = false
  }
}

watch(activeTab, (val) => {
  if (val === 'status') {
    fetchStatus()
  } else {
    fetchHistory()
  }
})

watch(contentType, () => {
  page.value = 1
  fetchStatus()
})

watch(page, fetchStatus)
watch(historyPage, fetchHistory)

fetchStatus()

useHead({
  title: '审核状态 - 作者中心'
})
</script>
