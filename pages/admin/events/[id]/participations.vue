<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <NuxtLink to="/admin/events" class="text-white/60 hover:text-white flex items-center gap-1 mb-2">
          <Icon name="ph:arrow-left" />
          返回活动列表
        </NuxtLink>
        <h1 class="text-3xl font-bold">报名审核 - {{ eventData?.title || '加载中...' }}</h1>
      </div>
    </div>

    <div v-if="eventData" class="card p-4 mb-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div class="text-sm text-white/50 mb-1">活动类型</div>
          <span :class="['px-2 py-1 rounded text-xs font-medium', typeClasses[eventData.type]]">
            {{ typeLabels[eventData.type] }}
          </span>
        </div>
        <div>
          <div class="text-sm text-white/50 mb-1">活动状态</div>
          <span :class="['px-2 py-1 rounded text-xs font-medium', statusClasses[eventData.status]]">
            {{ statusLabels[eventData.status] }}
          </span>
        </div>
        <div>
          <div class="text-sm text-white/50 mb-1">报名时间</div>
          <div class="text-sm">{{ formatDate(eventData.registrationStartAt) }} - {{ formatDate(eventData.registrationEndAt) }}</div>
        </div>
        <div>
          <div class="text-sm text-white/50 mb-1">报名总数</div>
          <div class="text-lg font-bold">{{ pagination?.total || 0 }}</div>
        </div>
      </div>
    </div>

    <div class="card p-4 mb-6">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <label class="text-sm text-white/70">状态：</label>
          <select v-model="filterStatus" class="form-input w-40" @change="refreshData">
            <option value="">全部</option>
            <option value="PENDING">待审核</option>
            <option value="APPROVED">已通过</option>
            <option value="REJECTED">已拒绝</option>
            <option value="WITHDRAWN">已撤销</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card overflow-hidden">
      <div v-if="loading" class="p-12 text-center">
        <Icon name="ph:spinner" class="text-4xl animate-spin text-neuro-primary" />
        <p class="mt-4 text-white/50">加载中...</p>
      </div>

      <div v-else-if="!participations.length" class="p-12 text-center text-white/50">
        <Icon name="ph:users" class="text-4xl mb-4" />
        <p>暂无报名记录</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-white/5">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">作品</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">作者</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">字数</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">标签</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">报名时间</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">状态</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">拒绝理由</th>
              <th class="px-6 py-4 text-right text-sm font-medium text-white/70">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr v-for="p in participations" :key="p.id" class="hover:bg-white/5 transition">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <NuxtLink :to="`/novels/${p.novel.id}`" class="flex-shrink-0">
                    <img
                      v-if="p.novel.cover"
                      :src="p.novel.cover"
                      :alt="p.novel.title"
                      class="w-12 h-16 rounded-lg object-cover"
                    />
                    <div v-else class="w-12 h-16 rounded-lg bg-white/10 flex items-center justify-center">
                      <Icon name="ph:book" class="text-white/40" />
                    </div>
                  </NuxtLink>
                  <div class="min-w-0">
                    <NuxtLink :to="`/novels/${p.novel.id}`" class="font-medium hover:text-neuro-primary transition line-clamp-1">
                      {{ p.novel.title }}
                    </NuxtLink>
                    <div class="text-sm text-white/50">{{ p.novel._count?.chapters || 0 }} 章</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <img
                    :src="p.novel.author?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'"
                    :alt="p.novel.author?.username"
                    class="w-6 h-6 rounded-full"
                  />
                  <span>{{ p.novel.author?.username }}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-white/70">
                {{ formatNumber(p.wordCount || 0) }}
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="tag in (p.novel.tags || []).slice(0, 3)"
                    :key="tag"
                    class="px-2 py-0.5 bg-white/10 rounded-full text-xs text-white/70"
                  >
                    #{{ tag }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 text-white/70 text-sm">
                {{ formatDate(p.registeredAt) }}
              </td>
              <td class="px-6 py-4">
                <span :class="['px-2 py-1 rounded text-xs font-medium', participationStatusClasses[p.status]]">
                  {{ participationStatusLabels[p.status] }}
                </span>
              </td>
              <td class="px-6 py-4 text-white/50 text-sm max-w-xs">
                {{ p.rejectionReason || '-' }}
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    v-if="p.status === 'PENDING'"
                    @click="handleApprove(p)"
                    class="px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition text-sm"
                    :disabled="actionLoading"
                  >
                    <Icon name="ph:check" class="mr-1" />
                    通过
                  </button>
                  <button
                    v-if="p.status === 'PENDING'"
                    @click="openRejectModal(p)"
                    class="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition text-sm"
                    :disabled="actionLoading"
                  >
                    <Icon name="ph:x" class="mr-1" />
                    拒绝
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
            <h3 class="text-xl font-bold mb-4">拒绝报名</h3>
            <p class="text-white/70 mb-4">
              请输入拒绝「{{ rejectModal.participation?.novel?.title }}」的理由：
            </p>
            <textarea
              v-model="rejectModal.reason"
              rows="4"
              class="form-input w-full resize-none"
              placeholder="请输入拒绝理由..."
            />
            <div class="flex justify-end gap-4 mt-6">
              <Button @click="rejectModal.visible = false" variant="secondary">取消</Button>
              <Button @click="confirmReject" :loading="actionLoading" variant="danger">确认拒绝</Button>
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

const route = useRoute()
const toast = useToast()

const eventId = computed(() => Number(route.params.id))

const page = ref(1)
const loading = ref(false)
const actionLoading = ref(false)
const filterStatus = ref('')

const eventData = ref<any>(null)
const participations = ref<any[]>([])
const pagination = ref<any>(null)

const rejectModal = ref({
  visible: false,
  participation: null as any,
  reason: ''
})

const statusLabels: Record<string, string> = {
  DRAFT: '草稿',
  UPCOMING: '即将开始',
  ONGOING: '进行中',
  ENDED: '已结束',
  CANCELLED: '已取消'
}

const statusClasses: Record<string, string> = {
  DRAFT: 'bg-gray-500/20 text-gray-400',
  UPCOMING: 'bg-blue-500/20 text-blue-400',
  ONGOING: 'bg-green-500/20 text-green-400',
  ENDED: 'bg-purple-500/20 text-purple-400',
  CANCELLED: 'bg-red-500/20 text-red-400'
}

const typeLabels: Record<string, string> = {
  CONTEST: '征文大赛',
  VOTING: '投票活动',
  COLLECTION: '作品征集',
  PROMOTION: '推广活动'
}

const typeClasses: Record<string, string> = {
  CONTEST: 'bg-pink-500/20 text-pink-400',
  VOTING: 'bg-cyan-500/20 text-cyan-400',
  COLLECTION: 'bg-amber-500/20 text-amber-400',
  PROMOTION: 'bg-violet-500/20 text-violet-400'
}

const participationStatusLabels: Record<string, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  WITHDRAWN: '已撤销'
}

const participationStatusClasses: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  APPROVED: 'bg-green-500/20 text-green-400',
  REJECTED: 'bg-red-500/20 text-red-400',
  WITHDRAWN: 'bg-gray-500/20 text-gray-400'
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const formatNumber = (num: number) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

const fetchEvent = async () => {
  try {
    const data: any = await $fetch(`/api/admin/events/${eventId.value}`)
    eventData.value = data.event
  } catch (e: any) {
    toast.error(e.message || '加载活动信息失败')
  }
}

const fetchParticipations = async () => {
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      limit: 20
    }
    if (filterStatus.value) params.status = filterStatus.value

    const data: any = await $fetch(`/api/admin/events/${eventId.value}/participations`, { query: params })
    participations.value = data.participations
    pagination.value = data.pagination
  } catch (e: any) {
    toast.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  page.value = 1
  fetchParticipations()
}

const handleApprove = async (participation: any) => {
  actionLoading.value = true
  try {
    await $fetch(`/api/admin/events/participations/${participation.id}/action`, {
      method: 'POST',
      body: {
        status: 'APPROVED'
      }
    })
    toast.success('审核通过')
    fetchParticipations()
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  } finally {
    actionLoading.value = false
  }
}

const openRejectModal = (participation: any) => {
  rejectModal.value = {
    visible: true,
    participation,
    reason: ''
  }
}

const confirmReject = async () => {
  if (!rejectModal.value.reason.trim()) {
    toast.error('请输入拒绝理由')
    return
  }

  actionLoading.value = true
  try {
    await $fetch(`/api/admin/events/participations/${rejectModal.value.participation.id}/action`, {
      method: 'POST',
      body: {
        status: 'REJECTED',
        rejectionReason: rejectModal.value.reason
      }
    })
    toast.success('已拒绝')
    rejectModal.value.visible = false
    fetchParticipations()
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  } finally {
    actionLoading.value = false
  }
}

watch(page, fetchParticipations)

await fetchEvent()
fetchParticipations()

useHead({
  title: '报名审核 - 管理后台'
})
</script>
