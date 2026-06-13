<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-3xl font-bold">敏感词管理</h1>
      <div class="flex items-center gap-4">
        <NuxtLink to="/admin/review" class="btn-secondary">
          <Icon name="ph:arrow-left" class="mr-2" />
          返回审核
        </NuxtLink>
        <button @click="openAddModal" class="btn-primary">
          <Icon name="ph:plus" class="mr-2" />
          添加敏感词
        </button>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="card p-4 mb-6">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <label class="text-sm text-white/70">关键词：</label>
          <input
            v-model="filters.keyword"
            type="text"
            class="form-input w-48"
            placeholder="搜索敏感词..."
            @keyup.enter="refreshData"
          />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm text-white/70">级别：</label>
          <select
            v-model="filters.level"
            class="form-input w-40"
          >
            <option value="">全部</option>
            <option value="WARN">警告</option>
            <option value="BLOCK">禁止</option>
          </select>
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

    <!-- Sensitive Words List -->
    <div class="card overflow-hidden">
      <div v-if="loading" class="p-12 text-center">
        <Icon name="ph:spinner" class="text-4xl animate-spin text-neuro-primary" />
        <p class="mt-4 text-white/50">加载中...</p>
      </div>

      <div v-else-if="!words.length" class="p-12 text-center text-white/50">
        <Icon name="ph:shield-check" class="text-4xl mb-4" />
        <p>暂无敏感词</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-white/5">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">敏感词</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">级别</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">分类</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">创建时间</th>
              <th class="px-6 py-4 text-right text-sm font-medium text-white/70">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr v-for="word in words" :key="word.id" class="hover:bg-white/5 transition">
              <td class="px-6 py-4 font-medium">
                <span class="font-mono bg-white/10 px-2 py-1 rounded">{{ word.word }}</span>
              </td>
              <td class="px-6 py-4">
                <span :class="['px-2 py-1 rounded text-xs font-medium', levelClasses[word.level]]">
                  {{ levelLabels[word.level] }}
                </span>
              </td>
              <td class="px-6 py-4 text-white/70">
                {{ word.category || '-' }}
              </td>
              <td class="px-6 py-4 text-white/50 text-sm">
                {{ formatDate(word.createdAt) }}
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openEditModal(word)"
                    class="p-2 hover:bg-white/10 rounded-lg transition"
                    title="编辑"
                  >
                    <Icon name="ph:pencil" />
                  </button>
                  <button
                    @click="handleDelete(word)"
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

    <!-- Add/Edit Modal -->
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
          <div class="card p-6 max-w-lg w-full">
            <h3 class="text-xl font-bold mb-6">{{ modal.editId ? '编辑敏感词' : '添加敏感词' }}</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">敏感词</label>
                <input
                  v-model="modal.word"
                  type="text"
                  class="form-input w-full"
                  placeholder="请输入敏感词"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">违规级别</label>
                <select v-model="modal.level" class="form-input w-full">
                  <option value="WARN">警告（仅提示，进入人工审核）</option>
                  <option value="BLOCK">禁止（阻止提交）</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">分类（可选）</label>
                <input
                  v-model="modal.category"
                  type="text"
                  class="form-input w-full"
                  placeholder="如：政治、色情、暴力等"
                />
              </div>
            </div>
            <div class="flex justify-end gap-4 mt-6">
              <Button @click="modal.visible = false" variant="secondary">取消</Button>
              <Button @click="confirmModal" :loading="actionLoading" variant="primary">
                {{ modal.editId ? '保存' : '添加' }}
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Confirmation Modal -->
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
              确定要删除敏感词「<span class="font-mono bg-white/10 px-1 rounded">{{ deleteTarget.word }}</span>」吗？
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
  level: ''
})

const words = ref<any[]>([])
const pagination = ref<any>(null)

const modal = ref({
  visible: false,
  editId: null as number | null,
  word: '',
  level: 'WARN' as 'WARN' | 'BLOCK',
  category: ''
})

const deleteTarget = ref<any>(null)

const levelLabels: Record<string, string> = {
  WARN: '警告',
  BLOCK: '禁止'
}

const levelClasses: Record<string, string> = {
  WARN: 'bg-yellow-500/20 text-yellow-400',
  BLOCK: 'bg-red-500/20 text-red-400'
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const fetchWords = async () => {
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      limit: 20
    }
    if (filters.value.keyword) params.keyword = filters.value.keyword
    if (filters.value.level) params.level = filters.value.level

    const data = await $fetch('/api/admin/sensitive-words', { query: params })
    words.value = data.words
    pagination.value = data.pagination
  } catch (e: any) {
    toast.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  page.value = 1
  fetchWords()
}

const resetFilters = () => {
  filters.value = {
    keyword: '',
    level: ''
  }
  refreshData()
}

const openAddModal = () => {
  modal.value = {
    visible: true,
    editId: null,
    word: '',
    level: 'WARN',
    category: ''
  }
}

const openEditModal = (word: any) => {
  modal.value = {
    visible: true,
    editId: word.id,
    word: word.word,
    level: word.level,
    category: word.category || ''
  }
}

const confirmModal = async () => {
  if (!modal.value.word.trim()) {
    toast.error('请输入敏感词')
    return
  }

  actionLoading.value = true
  try {
    if (modal.value.editId) {
      await $fetch(`/api/admin/sensitive-words/${modal.value.editId}`, {
        method: 'PUT',
        body: {
          word: modal.value.word,
          level: modal.value.level,
          category: modal.value.category || undefined
        }
      })
      toast.success('修改成功')
    } else {
      await $fetch('/api/admin/sensitive-words', {
        method: 'POST',
        body: {
          word: modal.value.word,
          level: modal.value.level,
          category: modal.value.category || undefined
        }
      })
      toast.success('添加成功')
    }
    modal.value.visible = false
    fetchWords()
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  } finally {
    actionLoading.value = false
  }
}

const handleDelete = (word: any) => {
  deleteTarget.value = word
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await $fetch(`/api/admin/sensitive-words/${deleteTarget.value.id}`, {
      method: 'DELETE'
    })
    toast.success('删除成功')
    deleteTarget.value = null
    fetchWords()
  } catch (e: any) {
    toast.error(e.message || '删除失败')
  } finally {
    deleteLoading.value = false
  }
}

watch(page, fetchWords)

fetchWords()

useHead({
  title: '敏感词管理 - 管理后台'
})
</script>
