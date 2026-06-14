<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-3xl font-bold">公告管理</h1>
      <button @click="openAddModal" class="btn-primary">
        <Icon name="ph:plus" class="mr-2" />
        新建公告
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
            placeholder="搜索公告..."
            @keyup.enter="refreshData"
          />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm text-white/70">优先级：</label>
          <select v-model="filters.priority" class="form-input w-40">
            <option value="">全部</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm text-white/70">状态：</label>
          <select v-model="filters.isActive" class="form-input w-40">
            <option value="">全部</option>
            <option value="true">已激活</option>
            <option value="false">未激活</option>
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

      <div v-else-if="!announcements.length" class="p-12 text-center text-white/50">
        <Icon name="ph:megaphone" class="text-4xl mb-4" />
        <p>暂无公告</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-white/5">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">标题</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">优先级</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">目标用户</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">生效时间</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">状态</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">创建时间</th>
              <th class="px-6 py-4 text-right text-sm font-medium text-white/70">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr v-for="item in announcements" :key="item.id" class="hover:bg-white/5 transition">
              <td class="px-6 py-4 font-medium max-w-xs truncate">
                {{ item.title }}
              </td>
              <td class="px-6 py-4">
                <span :class="['px-2 py-1 rounded text-xs font-medium', priorityClasses[item.priority]]">
                  {{ item.priority }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span :class="['px-2 py-1 rounded text-xs font-medium', targetClasses[item.target]]">
                  {{ targetLabels[item.target] }}
                </span>
              </td>
              <td class="px-6 py-4 text-white/70 text-sm">
                <div>{{ formatDate(item.startAt) }}</div>
                <div class="text-white/50">至 {{ formatDate(item.endAt) }}</div>
              </td>
              <td class="px-6 py-4">
                <span v-if="item.isActive" class="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                  已激活
                </span>
                <span v-else class="px-2 py-1 rounded text-xs font-medium bg-gray-500/20 text-gray-400">
                  未激活
                </span>
              </td>
              <td class="px-6 py-4 text-white/50 text-sm">
                {{ formatDate(item.createdAt) }}
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openEditModal(item)"
                    class="p-2 hover:bg-white/10 rounded-lg transition"
                    title="编辑"
                  >
                    <Icon name="ph:pencil" />
                  </button>
                  <button
                    @click="handleDelete(item)"
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
            <h3 class="text-xl font-bold mb-6">{{ modal.editId ? '编辑公告' : '新建公告' }}</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">标题 <span class="text-neuro-primary">*</span></label>
                <input v-model="modal.title" type="text" class="form-input w-full" placeholder="请输入公告标题" />
              </div>
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">内容 <span class="text-neuro-primary">*</span></label>
                <textarea v-model="modal.content" rows="6" class="form-input w-full resize-none" placeholder="请输入公告内容" />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-white/70 mb-2">优先级</label>
                  <select v-model="modal.priority" class="form-input w-full">
                    <option value="LOW">LOW - 低</option>
                    <option value="MEDIUM">MEDIUM - 中</option>
                    <option value="HIGH">HIGH - 高</option>
                    <option value="URGENT">URGENT - 紧急</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-white/70 mb-2">目标用户</label>
                  <select v-model="modal.target" class="form-input w-full">
                    <option value="ALL">ALL - 所有用户</option>
                    <option value="USER">USER - 登录用户</option>
                    <option value="AUTHOR">AUTHOR - 作者</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-white/70 mb-2">生效开始时间 <span class="text-neuro-primary">*</span></label>
                  <input v-model="modal.startAt" type="datetime-local" class="form-input w-full" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-white/70 mb-2">生效结束时间 <span class="text-neuro-primary">*</span></label>
                  <input v-model="modal.endAt" type="datetime-local" class="form-input w-full" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="flex items-center gap-2">
                  <input
                    v-model="modal.isActive"
                    type="checkbox"
                    id="isActive"
                    class="w-4 h-4 rounded bg-white/10 border-white/20 text-neuro-primary focus:ring-neuro-primary"
                  />
                  <label for="isActive" class="text-sm text-white/70">是否激活</label>
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
              确定要删除公告「{{ deleteTarget.title }}」吗？此操作不可撤销。
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
  priority: '',
  isActive: ''
})

const announcements = ref<any[]>([])
const pagination = ref<any>(null)

const modal = ref({
  visible: false,
  editId: null as number | null,
  title: '',
  content: '',
  priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
  target: 'ALL' as 'ALL' | 'USER' | 'AUTHOR',
  startAt: '',
  endAt: '',
  isActive: true,
  sortOrder: 0
})

const deleteTarget = ref<any>(null)

const priorityClasses: Record<string, string> = {
  URGENT: 'bg-red-500/20 text-red-400',
  HIGH: 'bg-orange-500/20 text-orange-400',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400',
  LOW: 'bg-blue-500/20 text-blue-400'
}

const targetLabels: Record<string, string> = {
  ALL: '所有用户',
  USER: '登录用户',
  AUTHOR: '作者'
}

const targetClasses: Record<string, string> = {
  ALL: 'bg-purple-500/20 text-purple-400',
  USER: 'bg-green-500/20 text-green-400',
  AUTHOR: 'bg-cyan-500/20 text-cyan-400'
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

const fetchAnnouncements = async () => {
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      limit: 20
    }
    if (filters.value.keyword) params.keyword = filters.value.keyword
    if (filters.value.priority) params.priority = filters.value.priority
    if (filters.value.isActive !== '') params.isActive = filters.value.isActive

    const data: any = await $fetch('/api/admin/announcements', { query: params })
    announcements.value = data.announcements
    pagination.value = data.pagination
  } catch (e: any) {
    toast.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  page.value = 1
  fetchAnnouncements()
}

const resetFilters = () => {
  filters.value = {
    keyword: '',
    priority: '',
    isActive: ''
  }
  refreshData()
}

const openAddModal = () => {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const defaultDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const defaultEndDate = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`

  modal.value = {
    visible: true,
    editId: null,
    title: '',
    content: '',
    priority: 'MEDIUM',
    target: 'ALL',
    startAt: defaultDate,
    endAt: defaultEndDate,
    isActive: true,
    sortOrder: 0
  }
}

const openEditModal = (item: any) => {
  modal.value = {
    visible: true,
    editId: item.id,
    title: item.title,
    content: item.content,
    priority: item.priority,
    target: item.target,
    startAt: toLocalInput(item.startAt),
    endAt: toLocalInput(item.endAt),
    isActive: item.isActive,
    sortOrder: item.sortOrder || 0
  }
}

const confirmModal = async () => {
  if (!modal.value.title.trim()) {
    toast.error('请输入公告标题')
    return
  }
  if (!modal.value.content.trim()) {
    toast.error('请输入公告内容')
    return
  }
  if (!modal.value.startAt || !modal.value.endAt) {
    toast.error('请填写完整的生效时间')
    return
  }

  actionLoading.value = true
  try {
    const body: any = {
      title: modal.value.title,
      content: modal.value.content,
      priority: modal.value.priority,
      target: modal.value.target,
      startAt: new Date(modal.value.startAt).toISOString(),
      endAt: new Date(modal.value.endAt).toISOString(),
      isActive: modal.value.isActive,
      sortOrder: modal.value.sortOrder
    }

    if (modal.value.editId) {
      await $fetch(`/api/admin/announcements/${modal.value.editId}`, {
        method: 'PUT',
        body
      })
      toast.success('修改成功')
    } else {
      await $fetch('/api/admin/announcements', {
        method: 'POST',
        body
      })
      toast.success('创建成功')
    }
    modal.value.visible = false
    fetchAnnouncements()
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  } finally {
    actionLoading.value = false
  }
}

const handleDelete = (item: any) => {
  deleteTarget.value = item
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await $fetch(`/api/admin/announcements/${deleteTarget.value.id}`, {
      method: 'DELETE'
    })
    toast.success('删除成功')
    deleteTarget.value = null
    fetchAnnouncements()
  } catch (e: any) {
    toast.error(e.message || '删除失败')
  } finally {
    deleteLoading.value = false
  }
}

watch(page, fetchAnnouncements)

fetchAnnouncements()

useHead({
  title: '公告管理 - 管理后台'
})
</script>
