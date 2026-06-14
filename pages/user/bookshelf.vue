<template>
  <div class="min-h-screen py-8">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-3xl font-bold">我的书架</h1>
        
        <div class="flex items-center gap-3">
          <button
            :class="[
              'px-3 py-2 rounded-lg transition flex items-center gap-2',
              selectMode 
                ? 'bg-neuro-primary/20 text-neuro-primary' 
                : 'bg-white/10 hover:bg-white/20'
            ]"
            @click="toggleSelectMode"
          >
            <Icon name="ph:squares-four" class="w-5 h-5" />
            <span class="hidden sm:inline">批量管理</span>
          </button>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-6">
        <div class="w-full lg:w-64 flex-shrink-0">
          <BookListSidebar
            :book-lists="bookLists"
            :selected-list-id="selectedListId"
            :total-count="favorites.length"
            @create-list="showCreateListForm = true"
            @edit-list="handleEditList"
            @delete-list="handleDeleteList"
            @select-list="handleSelectList"
            @reorder="handleReorderLists"
          />
        </div>

        <div class="flex-1 min-w-0">
          <div class="glass rounded-2xl p-4 mb-6">
            <div class="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              <div class="relative flex-1">
                <Icon 
                  name="ph:magnifying-glass" 
                  class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" 
                />
                <input
                  v-model="searchQuery"
                  type="text"
                  class="input-field pl-10"
                  placeholder="搜索书架中的小说..."
                />
                <button
                  v-if="searchQuery"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  @click="searchQuery = ''"
                >
                  <Icon name="ph:x" class="w-5 h-5" />
                </button>
              </div>

              <div class="flex items-center gap-2 flex-wrap">
                <div class="flex items-center bg-white/5 rounded-lg p-1">
                  <button
                    v-for="mode in viewModes"
                    :key="mode.value"
                    :class="[
                      'p-2 rounded-md transition',
                      viewMode === mode.value 
                        ? 'bg-neuro-primary text-white' 
                        : 'hover:bg-white/10 text-white/60'
                    ]"
                    :title="mode.label"
                    @click="handleViewModeChange(mode.value)"
                  >
                    <Icon :name="mode.icon" class="w-5 h-5" />
                  </button>
                </div>

                <select
                  v-model="sortBy"
                  class="input-field text-sm"
                  @change="handleSortChange"
                >
                  <option value="lastReadAt">最近阅读</option>
                  <option value="favoritedAt">收藏时间</option>
                  <option value="updatedAt">更新时间</option>
                  <option value="title">书名</option>
                </select>

                <button
                  :class="[
                    'p-2 rounded-lg bg-white/10 hover:bg-white/20 transition',
                    sortOrder === 'desc' ? 'text-neuro-primary' : ''
                  ]"
                  @click="handleSortOrderChange"
                >
                  <Icon 
                    :name="sortOrder === 'desc' ? 'ph:arrow-down' : 'ph:arrow-up'" 
                    class="w-5 h-5" 
                  />
                </button>
              </div>
            </div>
          </div>

          <div v-if="pending" :class="gridClasses">
            <NovelCardSkeleton v-for="i in 8" :key="i" />
          </div>

          <div 
            v-else-if="filteredFavorites.length === 0" 
            class="text-center py-20"
          >
            <Icon 
              v-if="selectedListId" 
              name="ph:folder-open" 
              class="text-6xl text-white/30 mb-4" 
            />
            <Icon 
              v-else 
              name="ph:heart" 
              class="text-6xl text-white/30 mb-4" 
            />
            <p class="text-xl text-white/50">
              {{ searchQuery ? '没有找到匹配的小说' : (selectedListId ? '这个书单还没有小说' : '还没有收藏任何小说') }}
            </p>
            <NuxtLink 
              v-if="!selectedListId && !searchQuery"
              to="/novels" 
              class="btn-primary mt-4 inline-block"
            >
              去小说库看看
            </NuxtLink>
          </div>

          <div v-else :class="containerClasses">
            <BookshelfBookCard
              v-for="item in filteredFavorites"
              :key="item.id"
              :item="item"
              :view-mode="viewMode"
              :select-mode="selectMode"
              :selected="selectedIds.includes(item.id)"
              @continue-reading="handleContinueReading"
              @more="handleMoreAction"
              @toggle-select="handleToggleSelect"
            />
          </div>
        </div>
      </div>
    </div>

    <BatchActionBar
      :visible="selectMode"
      :selected-count="selectedIds.length"
      :total-count="filteredFavorites.length"
      :book-lists="bookLists"
      @select-all="handleSelectAll"
      @clear-selection="clearSelection"
      @batch-action="handleBatchAction"
      @add-to-lists="handleBatchAddToLists"
      @create-list="showCreateListForm = true"
    />

    <BookItemActionMenu
      :visible="actionMenuVisible"
      :item="activeItem"
      :position="actionMenuPosition"
      :book-lists="bookLists"
      @close="actionMenuVisible = false"
      @action="handleItemAction"
      @add-to-lists="handleItemAddToLists"
      @create-list="showCreateListForm = true"
    />

    <BookListForm
      v-if="showCreateListForm"
      :editing-list="editingList"
      @close="closeListForm"
      @submit="handleListFormSubmit"
    />

    <Toast />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const toast = useToast()
const router = useRouter()

const viewMode = ref<'grid' | 'list' | 'compact'>('grid')
const sortBy = ref('lastReadAt')
const sortOrder = ref<'asc' | 'desc'>('desc')
const searchQuery = ref('')
const selectedListId = ref<number | null>(null)

const selectMode = ref(false)
const selectedIds = ref<number[]>([])

const actionMenuVisible = ref(false)
const activeItem = ref<any>(null)
const actionMenuPosition = ref({ x: 0, y: 0 })

const showCreateListForm = ref(false)
const editingList = ref<any>(null)

const bookLists = ref<any[]>([])

const viewModes = [
  { value: 'grid', label: '大图模式', icon: 'ph:squares-four' },
  { value: 'list', label: '列表模式', icon: 'ph:list' },
  { value: 'compact', label: '紧凑模式', icon: 'ph:list-dashes' }
]

const { data, pending, refresh } = await useFetch('/api/user/bookshelf', {
  query: computed(() => ({
    search: searchQuery.value,
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
    bookListId: selectedListId.value || undefined
  }))
})

const favorites = computed(() => data.value?.favorites || [])
const settings = computed(() => data.value?.settings)

watch(() => settings.value, (val) => {
  if (val) {
    viewMode.value = (val.bookshelfViewMode as any) || 'grid'
    sortBy.value = val.bookshelfSortBy || 'lastReadAt'
    sortOrder.value = (val.bookshelfSortOrder as any) || 'desc'
  }
}, { immediate: true })

watchEffect(() => {
  if (data.value?.bookLists) {
    bookLists.value = data.value.bookLists
  }
})

const filteredFavorites = computed(() => {
  let items = [...favorites.value]
  
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter(item => 
      item.novel?.title?.toLowerCase().includes(query) ||
      item.novel?.author?.username?.toLowerCase().includes(query)
    )
  }
  
  return items
})

const gridClasses = computed(() => {
  if (viewMode.value === 'grid') {
    return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
  }
  if (viewMode.value === 'list') {
    return 'space-y-4'
  }
  return 'space-y-2'
})

const containerClasses = computed(() => {
  if (viewMode.value === 'grid') {
    return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
  }
  if (viewMode.value === 'list') {
    return 'space-y-4'
  }
  return 'space-y-2'
})

const saveSettings = async (key: string, value: any) => {
  try {
    await $fetch('/api/user/bookshelf/settings', {
      method: 'POST',
      body: { [key]: value }
    })
  } catch (e: any) {
    toast.error(e.message || '保存设置失败')
  }
}

const handleViewModeChange = (mode: 'grid' | 'list' | 'compact') => {
  viewMode.value = mode
  saveSettings('viewMode', mode)
}

const handleSortChange = () => {
  saveSettings('sortBy', sortBy.value)
}

const handleSortOrderChange = () => {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  saveSettings('sortOrder', sortOrder.value)
}

const handleSelectList = (id: number | null) => {
  selectedListId.value = id
  clearSelection()
}

const toggleSelectMode = () => {
  selectMode.value = !selectMode.value
  if (!selectMode.value) {
    clearSelection()
  }
}

const handleToggleSelect = (id: number) => {
  const index = selectedIds.value.indexOf(id)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(id)
  }
}

const handleSelectAll = () => {
  if (selectedIds.value.length === filteredFavorites.value.length) {
    clearSelection()
  } else {
    selectedIds.value = filteredFavorites.value.map((item: any) => item.id)
  }
}

const clearSelection = () => {
  selectedIds.value = []
}

const handleContinueReading = async (item: any) => {
  if (item.lastChapterId) {
    try {
      await $fetch(`/api/user/bookshelf/${item.novelId}/clear-update`, {
        method: 'POST'
      })
    } catch (e) {
      // 静默失败
    }
    router.push(`/novels/${item.novelId}/chapters/${item.lastChapterId}`)
  } else {
    router.push(`/novels/${item.novelId}`)
  }
}

const handleMoreAction = (item: any, event: MouseEvent) => {
  activeItem.value = item
  actionMenuPosition.value = {
    x: event.clientX,
    y: event.clientY
  }
  actionMenuVisible.value = true
}

const handleItemAction = async (action: string, item: any) => {
  try {
    switch (action) {
      case 'continue':
        handleContinueReading(item)
        break
      case 'mark_reading':
      case 'mark_finished':
      case 'mark_unread':
      case 'remove':
        await $fetch('/api/user/bookshelf/batch', {
          method: 'POST',
          body: {
            action: action === 'mark_reading' ? 'mark_read' : action,
            favoriteIds: [item.id]
          }
        })
        toast.success('操作成功')
        refresh()
        break
    }
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  }
}

const handleItemAddToLists = async (item: any, listIds: number[]) => {
  try {
    await $fetch('/api/user/bookshelf/batch', {
      method: 'POST',
      body: {
        action: 'move_to_list',
        favoriteIds: [item.id],
        bookListIds: listIds
      }
    })
    toast.success('已添加到书单')
    refresh()
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  }
}

const handleBatchAction = async (action: string) => {
  if (selectedIds.value.length === 0) return
  
  try {
    const actionMap: Record<string, string> = {
      'mark_reading': 'mark_read',
      'mark_finished': 'mark_finished',
      'mark_unread': 'mark_unread',
      'remove': 'remove'
    }
    
    await $fetch('/api/user/bookshelf/batch', {
      method: 'POST',
      body: {
        action: actionMap[action] || action,
        favoriteIds: selectedIds.value
      }
    })
    
    toast.success('批量操作成功')
    clearSelection()
    selectMode.value = false
    refresh()
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  }
}

const handleBatchAddToLists = async (listIds: number[]) => {
  if (selectedIds.value.length === 0 || listIds.length === 0) return
  
  try {
    await $fetch('/api/user/bookshelf/batch', {
      method: 'POST',
      body: {
        action: 'move_to_list',
        favoriteIds: selectedIds.value,
        bookListIds: listIds
      }
    })
    
    toast.success('已添加到书单')
    clearSelection()
    selectMode.value = false
    refresh()
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  }
}

const handleEditList = (list: any) => {
  editingList.value = list
  showCreateListForm.value = true
}

const handleDeleteList = async (id: number) => {
  if (!confirm('确定要删除这个书单吗？书单内的小说不会被删除。')) {
    return
  }
  try {
    await $fetch(`/api/user/booklists/${id}`, {
      method: 'DELETE'
    })
    if (selectedListId.value === id) {
      selectedListId.value = null
    }
    toast.success('书单已删除')
    refresh()
  } catch (e: any) {
    toast.error(e.message || '删除失败')
  }
}

const handleReorderLists = async (items: Array<{ id: number; sortOrder: number }>) => {
  try {
    await $fetch('/api/user/booklists/reorder', {
      method: 'POST',
      body: { items }
    })
    refresh()
  } catch (e: any) {
    toast.error(e.message || '排序失败')
  }
}

const closeListForm = () => {
  showCreateListForm.value = false
  editingList.value = null
}

const handleListFormSubmit = async (formData: any) => {
  try {
    if (editingList.value) {
      await $fetch(`/api/user/booklists/${editingList.value.id}`, {
        method: 'PUT',
        body: formData
      })
      toast.success('书单已更新')
    } else {
      await $fetch('/api/user/booklists', {
        method: 'POST',
        body: formData
      })
      toast.success('书单已创建')
    }
    closeListForm()
    refresh()
  } catch (e: any) {
    toast.error(e.message || '保存失败')
  }
}

useHead({
  title: '我的书架 - Neurosama 粉丝小说站'
})
</script>
