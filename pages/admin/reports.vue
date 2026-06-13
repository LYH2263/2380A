<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-3xl font-bold">评论举报管理</h1>
      <div class="flex items-center gap-2">
        <select
          v-model="statusFilter"
          class="input-field text-sm py-2"
          @change="refreshReports"
        >
          <option value="">全部状态</option>
          <option value="PENDING">待处理</option>
          <option value="RESOLVED">已处理</option>
          <option value="IGNORED">已忽略</option>
        </select>
      </div>
    </div>

    <div v-if="reports?.length" class="space-y-4">
      <div
        v-for="report in reports"
        :key="report.id"
        class="card p-6"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <span
                :class="[
                  'px-2 py-1 rounded-full text-xs font-medium',
                  statusStyles[report.status]
                ]"
              >
                {{ statusLabels[report.status] }}
              </span>
              <span
                :class="[
                  'px-2 py-1 rounded-full text-xs font-medium',
                  typeStyles[report.type]
                ]"
              >
                {{ typeLabels[report.type] }}
              </span>
              <span class="text-xs opacity-50">
                {{ formatDate(report.createdAt) }}
              </span>
            </div>

            <div class="mb-3">
              <p class="text-sm opacity-70 mb-1">举报理由：</p>
              <p class="text-sm">{{ report.reason }}</p>
            </div>

            <div class="mb-3">
              <p class="text-sm opacity-70 mb-1">举报人：</p>
              <div class="flex items-center gap-2">
                <img
                  :src="report.user.avatar"
                  :alt="report.user.username"
                  class="w-6 h-6 rounded-full"
                />
                <NuxtLink
                  :to="`/user/${report.user.username}`"
                  class="text-sm text-neuro-primary hover:underline"
                >
                  {{ report.user.username }}
                </NuxtLink>
              </div>
            </div>

            <div class="glass p-4 rounded-xl">
              <p class="text-sm opacity-70 mb-2">被举报评论：</p>
              <div class="flex items-start gap-2">
                <img
                  :src="report.comment.user.avatar"
                  :alt="report.comment.user.username"
                  class="w-8 h-8 rounded-full flex-shrink-0"
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <NuxtLink
                      :to="`/user/${report.comment.user.username}`"
                      class="font-medium text-sm text-neuro-primary hover:underline"
                    >
                      {{ report.comment.user.username }}
                    </NuxtLink>
                    <span class="text-xs opacity-50">
                      {{ formatDate(report.comment.createdAt) }}
                    </span>
                  </div>
                  <p class="text-sm opacity-80 whitespace-pre-wrap">{{ report.comment.content }}</p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="report.status === 'PENDING'" class="flex flex-col gap-2">
            <button
              @click="handleAction(report.id, 'RESOLVED')"
              class="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition text-sm font-medium"
            >
              删除评论
            </button>
            <button
              @click="handleAction(report.id, 'IGNORED')"
              class="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm"
            >
              忽略
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-20 opacity-50">
      <Icon name="ph:inbox" class="text-6xl mb-4" />
      <p class="text-xl">暂无举报记录</p>
    </div>

    <div v-if="pagination && pagination.totalPages > 1" class="mt-8 flex items-center justify-center gap-2">
      <button
        @click="goToPage(pagination.page - 1)"
        :disabled="pagination.page <= 1"
        class="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        上一页
      </button>
      <span class="text-sm opacity-70">
        第 {{ pagination.page }} / {{ pagination.totalPages }} 页
      </span>
      <button
        @click="goToPage(pagination.page + 1)"
        :disabled="pagination.page >= pagination.totalPages"
        class="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const toast = useToast()

const statusFilter = ref('')
const currentPage = ref(1)

const statusLabels: Record<string, string> = {
  PENDING: '待处理',
  RESOLVED: '已处理',
  IGNORED: '已忽略'
}

const statusStyles: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  RESOLVED: 'bg-green-500/20 text-green-400',
  IGNORED: 'bg-gray-500/20 text-gray-400'
}

const typeLabels: Record<string, string> = {
  SPAM: '垃圾广告',
  HARASSMENT: '骚扰攻击',
  HATE_SPEECH: '仇恨言论',
  EXPLICIT_CONTENT: '色情内容',
  OTHER: '其他'
}

const typeStyles: Record<string, string> = {
  SPAM: 'bg-blue-500/20 text-blue-400',
  HARASSMENT: 'bg-orange-500/20 text-orange-400',
  HATE_SPEECH: 'bg-red-500/20 text-red-400',
  EXPLICIT_CONTENT: 'bg-pink-500/20 text-pink-400',
  OTHER: 'bg-purple-500/20 text-purple-400'
}

const { data, refresh } = await useFetch('/api/admin/reports', {
  query: computed(() => ({
    status: statusFilter.value || undefined,
    page: currentPage.value,
    limit: 20
  }))
})

const reports = computed(() => data.value?.reports || [])
const pagination = computed(() => data.value?.pagination)

const refreshReports = () => {
  currentPage.value = 1
  refresh()
}

const goToPage = (page: number) => {
  currentPage.value = page
  refresh()
}

const handleAction = async (reportId: number, action: string) => {
  const confirmMsg = action === 'RESOLVED'
    ? '确定要删除这条评论吗？'
    : '确定要忽略这个举报吗？'

  if (!confirm(confirmMsg)) return

  try {
    await $fetch(`/api/admin/reports/${reportId}`, {
      method: 'POST',
      body: { action }
    })
    toast.success(action === 'RESOLVED' ? '评论已删除' : '举报已忽略')
    refresh()
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

useHead({
  title: '举报管理 - 管理后台'
})
</script>
