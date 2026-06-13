<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-3xl font-bold">内容审核</h1>
      <div class="flex items-center gap-4">
        <NuxtLink
          v-if="activeTab === 'queue'"
          to="/admin/sensitive-words"
          class="btn-secondary"
        >
          <Icon name="ph:shield-warning" class="mr-2" />
          敏感词管理
        </NuxtLink>
        <NuxtLink
          v-else
          to="/admin/review"
          class="btn-secondary"
        >
          <Icon name="ph:list-checks" class="mr-2" />
          返回审核队列
        </NuxtLink>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex items-center gap-2 mb-6">
      <button
        @click="activeTab = 'queue'"
        :class="[
          'px-6 py-3 rounded-lg font-medium transition',
          activeTab === 'queue'
            ? 'bg-white/10 text-white'
            : 'text-white/60 hover:bg-white/5'
        ]"
      >
        待审核队列
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

    <!-- Filter Bar -->
    <div v-if="activeTab === 'queue'" class="card p-4 mb-6">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <label class="text-sm text-white/70">内容类型：</label>
          <select
            v-model="filters.contentType"
            class="form-input w-40"
          >
            <option value="">全部</option>
            <option value="NOVEL">小说</option>
            <option value="CHAPTER">章节</option>
            <option value="COMMENT">评论</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm text-white/70">审核状态：</label>
          <select
            v-model="filters.status"
            class="form-input w-40"
          >
            <option value="PENDING">待审核</option>
            <option value="APPROVED">已通过</option>
            <option value="REJECTED">已拒绝</option>
            <option value="NEEDS_REVISION">待修改</option>
            <option value="">全部</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm text-white/70">提交时间：</label>
          <input
            v-model="filters.startDate"
            type="date"
            class="form-input w-40"
          />
          <span class="text-white/50">至</span>
          <input
            v-model="filters.endDate"
            type="date"
            class="form-input w-40"
          />
        </div>
        <button
          @click="refreshData"
          class="btn-primary"
        >
          <Icon name="ph:magnifying-glass" class="mr-2" />
          搜索
        </button>
        <button
          @click="resetFilters"
          class="btn-secondary"
        >
          重置
        </button>
      </div>
    </div>

    <!-- Review Queue -->
    <div v-if="activeTab === 'queue'" class="card overflow-hidden">
      <div v-if="loading" class="p-12 text-center">
        <Icon name="ph:spinner" class="text-4xl animate-spin text-neuro-primary" />
        <p class="mt-4 text-white/50">加载中...</p>
      </div>

      <div v-else-if="!items.length" class="p-12 text-center text-white/50">
        <Icon name="ph:check-circle" class="text-4xl mb-4" />
        <p>暂无待审核内容</p>
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
                <template v-else-if="item.contentType === 'COMMENT'">
                  评论 - {{ item.chapter?.title }}
                </template>
              </h3>

              <p class="text-white/70 text-sm mb-3 line-clamp-3">
                <template v-if="item.contentType === 'NOVEL'">
                  {{ item.description }}
                </template>
                <template v-else-if="item.contentType === 'CHAPTER'">
                  {{ item.content?.slice(0, 200) }}...
                </template>
                <template v-else-if="item.contentType === 'COMMENT'">
                  {{ item.content }}
                </template>
              </p>

              <div class="flex items-center gap-4 text-sm text-white/50">
                <div class="flex items-center gap-2">
                  <img
                    :src="getAuthorAvatar(item)"
                    :alt="getAuthorName(item)"
                    class="w-6 h-6 rounded-full"
                  />
                  <span>{{ getAuthorName(item) }}</span>
                </div>
                <span>提交于 {{ formatDate(item.submittedAt) }}</span>
              </div>

              <div v-if="item.rejectionReason" class="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p class="text-sm text-red-400">
                  <span class="font-medium">拒绝理由：</span>{{ item.rejectionReason }}
                </p>
              </div>
            </div>

            <div v-if="item.reviewStatus === 'PENDING'" class="flex flex-col gap-2">
              <button
                @click="handleApprove(item)"
                class="btn-primary px-4 py-2 text-sm"
              >
                <Icon name="ph:check" class="mr-1" />
                通过
              </button>
              <button
                @click="openRejectModal(item)"
                class="btn-danger px-4 py-2 text-sm"
              >
                <Icon name="ph:x" class="mr-1" />
                拒绝
              </button>
              <button
                @click="openRevisionModal(item)"
                class="btn-secondary px-4 py-2 text-sm"
              >
                <Icon name="ph:pencil" class="mr-1" />
                需修改
              </button>
              <button
                @click="openPreviewModal(item)"
                class="btn-secondary px-4 py-2 text-sm"
              >
                <Icon name="ph:eye" class="mr-1" />
                查看
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
                <template v-else-if="record.comment">{{ record.comment.content?.slice(0, 30) }}...</template>
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

    <!-- Reject Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="rejectModal.visible" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div class="card p-6 max-w-lg w-full">
            <h3 class="text-xl font-bold mb-4">拒绝内容</h3>
            <p class="text-white/70 mb-4">
              请填写拒绝理由，该理由会反馈给作者。
            </p>
            <textarea
              v-model="rejectModal.reason"
              class="form-input w-full h-32 resize-none mb-4"
              placeholder="请输入拒绝理由..."
            />
            <div class="flex justify-end gap-4">
              <Button @click="rejectModal.visible = false" variant="secondary">取消</Button>
              <Button @click="confirmReject" :loading="actionLoading" variant="danger">确认拒绝</Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Revision Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="revisionModal.visible" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div class="card p-6 max-w-lg w-full">
            <h3 class="text-xl font-bold mb-4">标记为需修改</h3>
            <p class="text-white/70 mb-4">
              请填写修改意见，该意见会反馈给作者。
            </p>
            <textarea
              v-model="revisionModal.reason"
              class="form-input w-full h-32 resize-none mb-4"
              placeholder="请输入修改意见..."
            />
            <div class="flex justify-end gap-4">
              <Button @click="revisionModal.visible = false" variant="secondary">取消</Button>
              <Button @click="confirmRevision" :loading="actionLoading" variant="primary">确认提交</Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Preview Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="previewModal.visible" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div class="card p-6 max-w-4xl w-full max-h-[80vh] overflow-auto">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-xl font-bold">{{ previewModal.item?.title || '内容预览' }}</h3>
              <button @click="previewModal.visible = false" class="p-2 hover:bg-white/10 rounded-lg">
                <Icon name="ph:x" />
              </button>
            </div>
            <div v-if="previewModal.item" class="prose prose-invert max-w-none">
              <div v-if="previewModal.item.contentType === 'NOVEL'" class="space-y-4">
                <div v-if="previewModal.item.cover" class="mb-4">
                  <img :src="previewModal.item.cover" :alt="previewModal.item.title" class="w-32 h-44 object-cover rounded" />
                </div>
                <h4 class="text-lg font-medium">作品简介</h4>
                <p class="text-white/80 whitespace-pre-wrap">{{ previewModal.item.description }}</p>
                <h4 class="text-lg font-medium mt-6">标签</h4>
                <div class="flex flex-wrap gap-2">
                  <span v-for="tag in previewModal.item.tags" :key="tag" class="px-3 py-1 bg-white/10 rounded-full text-sm">
                    {{ tag }}
                  </span>
                </div>
              </div>
              <div v-else-if="previewModal.item.contentType === 'CHAPTER'" class="space-y-4">
                <p class="text-white/60 text-sm">{{ previewModal.item.novel?.title }}</p>
                <div class="whitespace-pre-wrap text-white/90 leading-relaxed">
                  {{ previewModal.item.content }}
                </div>
              </div>
              <div v-else-if="previewModal.item.contentType === 'COMMENT'" class="space-y-4">
                <div class="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                  <img
                    :src="previewModal.item.user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'"
                    :alt="previewModal.item.user?.username"
                    class="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p class="font-medium">{{ previewModal.item.user?.username }}</p>
                    <p class="text-sm text-white/50">{{ formatDate(previewModal.item.createdAt) }}</p>
                  </div>
                </div>
                <p class="text-white/90">{{ previewModal.item.content }}</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const toast = useToast()

const activeTab = ref<'queue' | 'history'>('queue')
const page = ref(1)
const historyPage = ref(1)
const loading = ref(false)
const historyLoading = ref(false)
const actionLoading = ref(false)

const filters = ref({
  contentType: '',
  status: 'PENDING',
  startDate: '',
  endDate: ''
})

const items = ref<any[]>([])
const pagination = ref<any>(null)
const records = ref<any[]>([])
const historyPagination = ref<any>(null)

const rejectModal = ref({
  visible: false,
  reason: '',
  item: null as any
})

const revisionModal = ref({
  visible: false,
  reason: '',
  item: null as any
})

const previewModal = ref({
  visible: false,
  item: null as any
})

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

const getAuthorName = (item: any) => {
  if (item.contentType === 'NOVEL') return item.author?.username
  if (item.contentType === 'CHAPTER') return item.novel?.author?.username
  if (item.contentType === 'COMMENT') return item.user?.username
  return '未知'
}

const getAuthorAvatar = (item: any) => {
  const avatar = item.contentType === 'NOVEL'
    ? item.author?.avatar
    : item.contentType === 'CHAPTER'
      ? item.novel?.author?.avatar
      : item.user?.avatar
  return avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const fetchQueue = async () => {
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      limit: 10,
      status: filters.value.status
    }
    if (filters.value.contentType) params.contentType = filters.value.contentType
    if (filters.value.startDate) params.startDate = filters.value.startDate
    if (filters.value.endDate) params.endDate = filters.value.endDate

    const data = await $fetch('/api/admin/review/queue', { query: params })
    items.value = data.items
    pagination.value = data.pagination
  } catch (e: any) {
    toast.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const fetchHistory = async () => {
  historyLoading.value = true
  try {
    const data = await $fetch('/api/admin/review/history', {
      query: { page: historyPage.value, limit: 20 }
    })
    records.value = data.records
    historyPagination.value = data.pagination
  } catch (e: any) {
    toast.error(e.message || '加载失败')
  } finally {
    historyLoading.value = false
  }
}

const refreshData = () => {
  if (activeTab.value === 'queue') {
    page.value = 1
    fetchQueue()
  } else {
    historyPage.value = 1
    fetchHistory()
  }
}

const resetFilters = () => {
  filters.value = {
    contentType: '',
    status: 'PENDING',
    startDate: '',
    endDate: ''
  }
  refreshData()
}

const handleApprove = async (item: any) => {
  actionLoading.value = true
  try {
    await $fetch('/api/admin/review/action', {
      method: 'POST',
      body: {
        contentType: item.contentType,
        contentId: item.id,
        action: 'APPROVE'
      }
    })
    toast.success('审核通过')
    fetchQueue()
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  } finally {
    actionLoading.value = false
  }
}

const openRejectModal = (item: any) => {
  rejectModal.value = {
    visible: true,
    reason: '',
    item
  }
}

const confirmReject = async () => {
  if (!rejectModal.value.reason.trim()) {
    toast.error('请填写拒绝理由')
    return
  }
  actionLoading.value = true
  try {
    await $fetch('/api/admin/review/action', {
      method: 'POST',
      body: {
        contentType: rejectModal.value.item.contentType,
        contentId: rejectModal.value.item.id,
        action: 'REJECT',
        remark: rejectModal.value.reason
      }
    })
    toast.success('已拒绝')
    rejectModal.value.visible = false
    fetchQueue()
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  } finally {
    actionLoading.value = false
  }
}

const openRevisionModal = (item: any) => {
  revisionModal.value = {
    visible: true,
    reason: '',
    item
  }
}

const confirmRevision = async () => {
  if (!revisionModal.value.reason.trim()) {
    toast.error('请填写修改意见')
    return
  }
  actionLoading.value = true
  try {
    await $fetch('/api/admin/review/action', {
      method: 'POST',
      body: {
        contentType: revisionModal.value.item.contentType,
        contentId: revisionModal.value.item.id,
        action: 'NEEDS_REVISION',
        remark: revisionModal.value.reason
      }
    })
    toast.success('已标记为需修改')
    revisionModal.value.visible = false
    fetchQueue()
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  } finally {
    actionLoading.value = false
  }
}

const openPreviewModal = (item: any) => {
  previewModal.value = {
    visible: true,
    item
  }
}

watch(activeTab, (val) => {
  if (val === 'queue') {
    fetchQueue()
  } else {
    fetchHistory()
  }
})

watch(page, fetchQueue)
watch(historyPage, fetchHistory)

fetchQueue()

useHead({
  title: '内容审核 - 管理后台'
})
</script>
