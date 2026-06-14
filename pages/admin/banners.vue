<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-3xl font-bold">Banner管理</h1>
      <button @click="openAddModal" class="btn-primary">
        <Icon name="ph:plus" class="mr-2" />
        新建Banner
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
            placeholder="搜索Banner..."
            @keyup.enter="refreshData"
          />
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

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <div class="card overflow-hidden">
          <div v-if="loading" class="p-12 text-center">
            <Icon name="ph:spinner" class="text-4xl animate-spin text-neuro-primary" />
            <p class="mt-4 text-white/50">加载中...</p>
          </div>

          <div v-else-if="!banners.length" class="p-12 text-center text-white/50">
            <Icon name="ph:image" class="text-4xl mb-4" />
            <p>暂无Banner</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-white/5">
                <tr>
                  <th class="px-6 py-4 text-left text-sm font-medium text-white/70">预览</th>
                  <th class="px-6 py-4 text-left text-sm font-medium text-white/70">标题</th>
                  <th class="px-6 py-4 text-left text-sm font-medium text-white/70">跳转链接</th>
                  <th class="px-6 py-4 text-left text-sm font-medium text-white/70">显示时间</th>
                  <th class="px-6 py-4 text-left text-sm font-medium text-white/70">排序</th>
                  <th class="px-6 py-4 text-left text-sm font-medium text-white/70">状态</th>
                  <th class="px-6 py-4 text-right text-sm font-medium text-white/70">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/10">
                <tr v-for="(item, index) in banners" :key="item.id" class="hover:bg-white/5 transition">
                  <td class="px-6 py-4">
                    <div
                      @click="selectedBanner = item"
                      class="w-20 h-12 rounded-lg overflow-hidden cursor-pointer bg-white/5 hover:ring-2 hover:ring-neuro-primary transition"
                    >
                      <img
                        v-if="item.imageUrl"
                        :src="item.imageUrl"
                        :alt="item.title"
                        class="w-full h-full object-cover"
                      />
                      <div v-else class="w-full h-full flex items-center justify-center text-white/30">
                        <Icon name="ph:image" />
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 font-medium max-w-xs truncate">
                    {{ item.title }}
                  </td>
                  <td class="px-6 py-4 text-white/70 text-sm max-w-xs truncate">
                    {{ item.linkUrl || '-' }}
                  </td>
                  <td class="px-6 py-4 text-white/70 text-sm">
                    <div>{{ formatDate(item.startAt) }}</div>
                    <div class="text-white/50">至 {{ formatDate(item.endAt) }}</div>
                  </td>
                  <td class="px-6 py-4">
                    <span class="font-mono text-white/70">{{ item.sortOrder }}</span>
                  </td>
                  <td class="px-6 py-4">
                    <span v-if="item.isActive" class="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                      已激活
                    </span>
                    <span v-else class="px-2 py-1 rounded text-xs font-medium bg-gray-500/20 text-gray-400">
                      未激活
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <button
                        @click="moveUp(index)"
                        :disabled="index === 0"
                        class="p-2 hover:bg-white/10 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                        title="上移"
                      >
                        <Icon name="ph:arrow-up" />
                      </button>
                      <button
                        @click="moveDown(index)"
                        :disabled="index === banners.length - 1"
                        class="p-2 hover:bg-white/10 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                        title="下移"
                      >
                        <Icon name="ph:arrow-down" />
                      </button>
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
      </div>

      <div>
        <div class="card p-6 sticky top-4">
          <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
            <Icon name="ph:eye" class="text-neuro-primary" />
            Banner预览
          </h3>
          <div v-if="selectedBanner" class="space-y-4">
            <div class="relative rounded-xl overflow-hidden aspect-[16/9] bg-white/5">
              <img
                v-if="selectedBanner.imageUrl"
                :src="selectedBanner.imageUrl"
                :alt="selectedBanner.title"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-white/30">
                <Icon name="ph:image" class="text-5xl" />
              </div>
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div class="absolute bottom-4 left-4 right-4">
                <h4 class="text-lg font-bold">{{ selectedBanner.title }}</h4>
              </div>
            </div>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-white/50">跳转链接：</span>
                <a :href="selectedBanner.linkUrl" target="_blank" class="text-neuro-primary hover:underline truncate max-w-[200px]">
                  {{ selectedBanner.linkUrl || '-' }}
                </a>
              </div>
              <div class="flex justify-between">
                <span class="text-white/50">排序权重：</span>
                <span>{{ selectedBanner.sortOrder }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-white/50">状态：</span>
                <span :class="selectedBanner.isActive ? 'text-green-400' : 'text-gray-400'">
                  {{ selectedBanner.isActive ? '已激活' : '未激活' }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-white/50">显示时间：</span>
              </div>
              <div class="text-white/70">
                {{ formatDate(selectedBanner.startAt) }} ~ {{ formatDate(selectedBanner.endAt) }}
              </div>
            </div>
          </div>
          <div v-else class="text-center py-12 text-white/40">
            <Icon name="ph:mouse-pointer" class="text-4xl mb-2" />
            <p>点击左侧Banner的预览图查看详情</p>
          </div>
        </div>
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
            <h3 class="text-xl font-bold mb-6">{{ modal.editId ? '编辑Banner' : '新建Banner' }}</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">标题 <span class="text-neuro-primary">*</span></label>
                <input v-model="modal.title" type="text" class="form-input w-full" placeholder="请输入Banner标题" />
              </div>
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">图片URL <span class="text-neuro-primary">*</span></label>
                <input v-model="modal.imageUrl" type="text" class="form-input w-full" placeholder="https://..." />
              </div>
              <div v-if="modal.imageUrl" class="rounded-xl overflow-hidden aspect-[16/9] bg-white/5">
                <img :src="modal.imageUrl" :alt="modal.title" class="w-full h-full object-cover" onerror="this.style.display='none'" />
              </div>
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">跳转链接</label>
                <input v-model="modal.linkUrl" type="text" class="form-input w-full" placeholder="https://..." />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-white/70 mb-2">显示开始时间 <span class="text-neuro-primary">*</span></label>
                  <input v-model="modal.startAt" type="datetime-local" class="form-input w-full" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-white/70 mb-2">显示结束时间 <span class="text-neuro-primary">*</span></label>
                  <input v-model="modal.endAt" type="datetime-local" class="form-input w-full" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="flex items-center gap-2">
                  <input
                    v-model="modal.isActive"
                    type="checkbox"
                    id="bannerIsActive"
                    class="w-4 h-4 rounded bg-white/10 border-white/20 text-neuro-primary focus:ring-neuro-primary"
                  />
                  <label for="bannerIsActive" class="text-sm text-white/70">是否激活</label>
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
              确定要删除Banner「{{ deleteTarget.title }}」吗？此操作不可撤销。
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
const reorderLoading = ref(false)

const filters = ref({
  keyword: '',
  isActive: ''
})

const banners = ref<any[]>([])
const pagination = ref<any>(null)
const selectedBanner = ref<any>(null)

const modal = ref({
  visible: false,
  editId: null as number | null,
  title: '',
  imageUrl: '',
  linkUrl: '',
  startAt: '',
  endAt: '',
  sortOrder: 0,
  isActive: true
})

const deleteTarget = ref<any>(null)

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

const fetchBanners = async () => {
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      limit: 20
    }
    if (filters.value.keyword) params.keyword = filters.value.keyword
    if (filters.value.isActive !== '') params.isActive = filters.value.isActive

    const data: any = await $fetch('/api/admin/banners', { query: params })
    banners.value = data.banners
    pagination.value = data.pagination
    if (banners.value.length > 0 && !selectedBanner.value) {
      selectedBanner.value = banners.value[0]
    }
  } catch (e: any) {
    toast.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  page.value = 1
  fetchBanners()
}

const resetFilters = () => {
  filters.value = {
    keyword: '',
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
    imageUrl: '',
    linkUrl: '',
    startAt: defaultDate,
    endAt: defaultEndDate,
    sortOrder: 0,
    isActive: true
  }
}

const openEditModal = (item: any) => {
  modal.value = {
    visible: true,
    editId: item.id,
    title: item.title,
    imageUrl: item.imageUrl,
    linkUrl: item.linkUrl || '',
    startAt: toLocalInput(item.startAt),
    endAt: toLocalInput(item.endAt),
    sortOrder: item.sortOrder || 0,
    isActive: item.isActive
  }
}

const confirmModal = async () => {
  if (!modal.value.title.trim()) {
    toast.error('请输入Banner标题')
    return
  }
  if (!modal.value.imageUrl.trim()) {
    toast.error('请输入图片URL')
    return
  }
  if (!modal.value.startAt || !modal.value.endAt) {
    toast.error('请填写完整的显示时间')
    return
  }

  actionLoading.value = true
  try {
    const body: any = {
      title: modal.value.title,
      imageUrl: modal.value.imageUrl,
      linkUrl: modal.value.linkUrl || undefined,
      startAt: new Date(modal.value.startAt).toISOString(),
      endAt: new Date(modal.value.endAt).toISOString(),
      sortOrder: modal.value.sortOrder,
      isActive: modal.value.isActive
    }

    if (modal.value.editId) {
      await $fetch(`/api/admin/banners/${modal.value.editId}`, {
        method: 'PUT',
        body
      })
      toast.success('修改成功')
    } else {
      await $fetch('/api/admin/banners', {
        method: 'POST',
        body
      })
      toast.success('创建成功')
    }
    modal.value.visible = false
    fetchBanners()
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
    await $fetch(`/api/admin/banners/${deleteTarget.value.id}`, {
      method: 'DELETE'
    })
    toast.success('删除成功')
    if (selectedBanner.value?.id === deleteTarget.value.id) {
      selectedBanner.value = null
    }
    deleteTarget.value = null
    fetchBanners()
  } catch (e: any) {
    toast.error(e.message || '删除失败')
  } finally {
    deleteLoading.value = false
  }
}

const moveUp = async (index: number) => {
  if (index <= 0) return
  const items = [...banners.value]
  const temp = items[index].sortOrder
  items[index].sortOrder = items[index - 1].sortOrder
  items[index - 1].sortOrder = temp
  ;[items[index], items[index - 1]] = [items[index - 1], items[index]]
  banners.value = items

  reorderLoading.value = true
  try {
    await $fetch('/api/admin/banners/reorder', {
      method: 'POST',
      body: {
        items: items.map((item, i) => ({ id: item.id, sortOrder: i }))
      }
    })
    toast.success('排序已更新')
    fetchBanners()
  } catch (e: any) {
    toast.error(e.message || '排序更新失败')
    fetchBanners()
  } finally {
    reorderLoading.value = false
  }
}

const moveDown = async (index: number) => {
  if (index >= banners.value.length - 1) return
  const items = [...banners.value]
  const temp = items[index].sortOrder
  items[index].sortOrder = items[index + 1].sortOrder
  items[index + 1].sortOrder = temp
  ;[items[index], items[index + 1]] = [items[index + 1], items[index]]
  banners.value = items

  reorderLoading.value = true
  try {
    await $fetch('/api/admin/banners/reorder', {
      method: 'POST',
      body: {
        items: items.map((item, i) => ({ id: item.id, sortOrder: i }))
      }
    })
    toast.success('排序已更新')
    fetchBanners()
  } catch (e: any) {
    toast.error(e.message || '排序更新失败')
    fetchBanners()
  } finally {
    reorderLoading.value = false
  }
}

watch(page, fetchBanners)

fetchBanners()

useHead({
  title: 'Banner管理 - 管理后台'
})
</script>
