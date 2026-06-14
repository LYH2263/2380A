<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-3xl font-bold">活动管理</h1>
      <button @click="openAddModal" class="btn-primary">
        <Icon name="ph:plus" class="mr-2" />
        新建活动
      </button>
    </div>

    <div class="card p-4 mb-6">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <label class="text-sm text-white/70">关键词：</label>
          <input
            v-model="filters.keyword"
            type="text"
            class="form-input w-48"
            placeholder="搜索活动标题..."
            @keyup.enter="refreshData"
          />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm text-white/70">活动类型：</label>
          <select v-model="filters.type" class="form-input w-40">
            <option value="">全部</option>
            <option value="CONTEST">征文大赛</option>
            <option value="VOTING">投票活动</option>
            <option value="COLLECTION">作品征集</option>
            <option value="PROMOTION">推广活动</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm text-white/70">活动状态：</label>
          <select v-model="filters.status" class="form-input w-40">
            <option value="">全部</option>
            <option value="DRAFT">草稿</option>
            <option value="UPCOMING">即将开始</option>
            <option value="ONGOING">进行中</option>
            <option value="ENDED">已结束</option>
            <option value="CANCELLED">已取消</option>
          </select>
        </div>
        <button @click="refreshData" class="btn-primary">
          <Icon name="ph:magnifying-glass" class="mr-2" />
          搜索
        </button>
        <button @click="resetFilters" class="btn-secondary">
          重置
        </button>
      </div>
    </div>

    <div class="card overflow-hidden">
      <div v-if="loading" class="p-12 text-center">
        <Icon name="ph:spinner" class="text-4xl animate-spin text-neuro-primary" />
        <p class="mt-4 text-white/50">加载中...</p>
      </div>

      <div v-else-if="!events.length" class="p-12 text-center text-white/50">
        <Icon name="ph:calendar" class="text-4xl mb-4" />
        <p>暂无活动</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-white/5">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">标题</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">类型</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">状态</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">报名时间</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">活动时间</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">参与作品</th>
              <th class="px-6 py-4 text-right text-sm font-medium text-white/70">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr v-for="eventItem in events" :key="eventItem.id" class="hover:bg-white/5 transition">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <img
                    v-if="eventItem.coverImage"
                    :src="eventItem.coverImage"
                    :alt="eventItem.title"
                    class="w-12 h-12 rounded-lg object-cover"
                  />
                  <div class="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center" v-else>
                    <Icon name="ph:image" class="text-white/40" />
                  </div>
                  <span class="font-medium">{{ eventItem.title }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <span :class="['px-2 py-1 rounded text-xs font-medium', typeClasses[eventItem.type]]">
                  {{ typeLabels[eventItem.type] }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span :class="['px-2 py-1 rounded text-xs font-medium', statusClasses[eventItem.status]]">
                  {{ statusLabels[eventItem.status] }}
                </span>
              </td>
              <td class="px-6 py-4 text-white/70 text-sm">
                <div>{{ formatDate(eventItem.registrationStartAt) }}</div>
                <div class="text-white/50">至 {{ formatDate(eventItem.registrationEndAt) }}</div>
              </td>
              <td class="px-6 py-4 text-white/70 text-sm">
                <div>{{ formatDate(eventItem.eventStartAt) }}</div>
                <div class="text-white/50">至 {{ formatDate(eventItem.eventEndAt) }}</div>
              </td>
              <td class="px-6 py-4">
                <span class="font-medium">{{ eventItem._count?.participations || 0 }}</span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <NuxtLink
                    :to="`/admin/events/${eventItem.id}/participations`"
                    class="p-2 hover:bg-white/10 rounded-lg transition"
                    title="查看报名"
                  >
                    <Icon name="ph:users" />
                  </NuxtLink>
                  <button
                    @click="openEditModal(eventItem)"
                    class="p-2 hover:bg-white/10 rounded-lg transition"
                    title="编辑"
                  >
                    <Icon name="ph:pencil" />
                  </button>
                  <button
                    @click="handleDelete(eventItem)"
                    class="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                    title="删除"
                  >
                    <Icon name="ph:trash" />
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
        <div v-if="modal.visible" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div class="card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 class="text-xl font-bold mb-6">{{ modal.editId ? '编辑活动' : '新建活动' }}</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">活动标题 <span class="text-neuro-primary">*</span></label>
                <input v-model="modal.title" type="text" class="form-input w-full" placeholder="请输入活动标题" />
              </div>
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">活动描述 <span class="text-neuro-primary">*</span></label>
                <textarea v-model="modal.description" rows="3" class="form-input w-full resize-none" placeholder="请输入活动描述" />
              </div>
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">参与规则 <span class="text-neuro-primary">*</span></label>
                <textarea v-model="modal.rules" rows="4" class="form-input w-full resize-none" placeholder="请输入参与规则" />
              </div>
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">封面图URL</label>
                <input v-model="modal.coverImage" type="text" class="form-input w-full" placeholder="https://..." />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-white/70 mb-2">活动类型</label>
                  <select v-model="modal.type" class="form-input w-full">
                    <option value="CONTEST">征文大赛</option>
                    <option value="VOTING">投票活动</option>
                    <option value="COLLECTION">作品征集</option>
                    <option value="PROMOTION">推广活动</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-white/70 mb-2">活动状态</label>
                  <select v-model="modal.status" class="form-input w-full">
                    <option value="DRAFT">草稿</option>
                    <option value="UPCOMING">即将开始</option>
                    <option value="ONGOING">进行中</option>
                    <option value="ENDED">已结束</option>
                    <option value="CANCELLED">已取消</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-white/70 mb-2">报名开始时间 <span class="text-neuro-primary">*</span></label>
                  <input v-model="modal.registrationStartAt" type="datetime-local" class="form-input w-full" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-white/70 mb-2">报名结束时间 <span class="text-neuro-primary">*</span></label>
                  <input v-model="modal.registrationEndAt" type="datetime-local" class="form-input w-full" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-white/70 mb-2">活动开始时间 <span class="text-neuro-primary">*</span></label>
                  <input v-model="modal.eventStartAt" type="datetime-local" class="form-input w-full" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-white/70 mb-2">活动结束时间 <span class="text-neuro-primary">*</span></label>
                  <input v-model="modal.eventEndAt" type="datetime-local" class="form-input w-full" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-white/70 mb-2">最少字数</label>
                  <input v-model.number="modal.minWordCount" type="number" min="0" class="form-input w-full" placeholder="不限制" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-white/70 mb-2">最多字数</label>
                  <input v-model.number="modal.maxWordCount" type="number" min="0" class="form-input w-full" placeholder="不限制" />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">允许标签（逗号分隔）</label>
                <input
                  v-model="modal.allowedTagsText"
                  type="text"
                  class="form-input w-full"
                  placeholder="如：同人,甜文,虐文"
                />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="flex items-center gap-2">
                  <input
                    v-model="modal.requireNew"
                    type="checkbox"
                    id="requireNew"
                    class="w-4 h-4 rounded bg-white/10 border-white/20 text-neuro-primary focus:ring-neuro-primary"
                  />
                  <label for="requireNew" class="text-sm text-white/70">要求新作品（报名期间创建）</label>
                </div>
                <div>
                  <label class="block text-sm font-medium text-white/70 mb-2">排序权重</label>
                  <input v-model.number="modal.sortOrder" type="number" class="form-input w-full" placeholder="0" />
                </div>
              </div>
            </div>
            <div class="flex justify-end gap-4 mt-6">
              <Button @click="modal.visible = false" variant="secondary">取消</Button>
              <Button @click="confirmModal" :loading="actionLoading" variant="primary">
                {{ modal.editId ? '保存' : '创建' }}
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div class="card p-6 max-w-md w-full">
            <h3 class="text-xl font-bold mb-4">确认删除</h3>
            <p class="text-white/70 mb-6">
              确定要删除活动「{{ deleteTarget.title }}」吗？此操作不可撤销。
            </p>
            <div class="flex justify-end gap-4">
              <Button @click="deleteTarget = null" variant="secondary">取消</Button>
              <Button @click="confirmDelete" :loading="deleteLoading" variant="danger">删除</Button>
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

const page = ref(1)
const loading = ref(false)
const actionLoading = ref(false)
const deleteLoading = ref(false)

const filters = ref({
  keyword: '',
  type: '',
  status: ''
})

const events = ref<any[]>([])
const pagination = ref<any>(null)

const modal = ref({
  visible: false,
  editId: null as number | null,
  title: '',
  description: '',
  rules: '',
  coverImage: '',
  type: 'CONTEST' as 'CONTEST' | 'VOTING' | 'COLLECTION' | 'PROMOTION',
  status: 'DRAFT' as 'DRAFT' | 'UPCOMING' | 'ONGOING' | 'ENDED' | 'CANCELLED',
  registrationStartAt: '',
  registrationEndAt: '',
  eventStartAt: '',
  eventEndAt: '',
  minWordCount: null as number | null,
  maxWordCount: null as number | null,
  allowedTagsText: '',
  requireNew: false,
  sortOrder: 0
})

const deleteTarget = ref<any>(null)

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

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const toLocalInput = (date: string) => {
  if (!date) return ''
  const d = new Date(date)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const fetchEvents = async () => {
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      limit: 20
    }
    if (filters.value.keyword) params.keyword = filters.value.keyword
    if (filters.value.type) params.type = filters.value.type
    if (filters.value.status) params.status = filters.value.status

    const data: any = await $fetch('/api/admin/events', { query: params })
    events.value = data.events
    pagination.value = data.pagination
  } catch (e: any) {
    toast.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  page.value = 1
  fetchEvents()
}

const resetFilters = () => {
  filters.value = {
    keyword: '',
    type: '',
    status: ''
  }
  refreshData()
}

const openAddModal = () => {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const defaultDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`

  modal.value = {
    visible: true,
    editId: null,
    title: '',
    description: '',
    rules: '',
    coverImage: '',
    type: 'CONTEST',
    status: 'DRAFT',
    registrationStartAt: defaultDate,
    registrationEndAt: defaultDate,
    eventStartAt: defaultDate,
    eventEndAt: defaultDate,
    minWordCount: null,
    maxWordCount: null,
    allowedTagsText: '',
    requireNew: false,
    sortOrder: 0
  }
}

const openEditModal = (eventItem: any) => {
  modal.value = {
    visible: true,
    editId: eventItem.id,
    title: eventItem.title,
    description: eventItem.description,
    rules: eventItem.rules,
    coverImage: eventItem.coverImage || '',
    type: eventItem.type,
    status: eventItem.status,
    registrationStartAt: toLocalInput(eventItem.registrationStartAt),
    registrationEndAt: toLocalInput(eventItem.registrationEndAt),
    eventStartAt: toLocalInput(eventItem.eventStartAt),
    eventEndAt: toLocalInput(eventItem.eventEndAt),
    minWordCount: eventItem.minWordCount,
    maxWordCount: eventItem.maxWordCount,
    allowedTagsText: (eventItem.allowedTags || []).join(','),
    requireNew: eventItem.requireNew || false,
    sortOrder: eventItem.sortOrder || 0
  }
}

const confirmModal = async () => {
  if (!modal.value.title.trim()) {
    toast.error('请输入活动标题')
    return
  }
  if (!modal.value.description.trim()) {
    toast.error('请输入活动描述')
    return
  }
  if (!modal.value.rules.trim()) {
    toast.error('请输入参与规则')
    return
  }
  if (!modal.value.registrationStartAt || !modal.value.registrationEndAt || !modal.value.eventStartAt || !modal.value.eventEndAt) {
    toast.error('请填写完整的时间信息')
    return
  }

  actionLoading.value = true
  try {
    const body: any = {
      title: modal.value.title,
      description: modal.value.description,
      rules: modal.value.rules,
      coverImage: modal.value.coverImage || undefined,
      type: modal.value.type,
      status: modal.value.status,
      registrationStartAt: new Date(modal.value.registrationStartAt).toISOString(),
      registrationEndAt: new Date(modal.value.registrationEndAt).toISOString(),
      eventStartAt: new Date(modal.value.eventStartAt).toISOString(),
      eventEndAt: new Date(modal.value.eventEndAt).toISOString(),
      minWordCount: modal.value.minWordCount || undefined,
      maxWordCount: modal.value.maxWordCount || undefined,
      allowedTags: modal.value.allowedTagsText ? modal.value.allowedTagsText.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      requireNew: modal.value.requireNew,
      sortOrder: modal.value.sortOrder
    }

    if (modal.value.editId) {
      await $fetch(`/api/admin/events/${modal.value.editId}`, {
        method: 'PUT',
        body
      })
      toast.success('修改成功')
    } else {
      await $fetch('/api/admin/events', {
        method: 'POST',
        body
      })
      toast.success('创建成功')
    }
    modal.value.visible = false
    fetchEvents()
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  } finally {
    actionLoading.value = false
  }
}

const handleDelete = (eventItem: any) => {
  deleteTarget.value = eventItem
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await $fetch(`/api/admin/events/${deleteTarget.value.id}`, {
      method: 'DELETE'
    })
    toast.success('删除成功')
    deleteTarget.value = null
    fetchEvents()
  } catch (e: any) {
    toast.error(e.message || '删除失败')
  } finally {
    deleteLoading.value = false
  }
}

watch(page, fetchEvents)

fetchEvents()

useHead({
  title: '活动管理 - 管理后台'
})
</script>
