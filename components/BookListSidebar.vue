<template>
  <div class="glass rounded-2xl p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-bold text-lg">我的书单</h3>
      <button
        class="p-2 rounded-lg bg-neuro-primary/20 text-neuro-primary hover:bg-neuro-primary/30 transition"
        title="创建书单"
        @click="$emit('create-list')"
      >
        <Icon name="ph:plus" class="w-5 h-5" />
      </button>
    </div>

    <div class="space-y-1">
      <button
        :class="[
          'w-full text-left px-3 py-2.5 rounded-lg transition flex items-center gap-3',
          !selectedListId 
            ? 'bg-neuro-primary/20 text-neuro-primary' 
            : 'hover:bg-white/10'
        ]"
        @click="$emit('select-list', null)"
      >
        <Icon name="ph:books" class="w-5 h-5 flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <div class="font-medium">全部收藏</div>
          <div class="text-xs opacity-60">{{ totalCount }} 本</div>
        </div>
      </button>

      <div 
        v-for="list in bookLists" 
        :key="list.id"
        class="group"
      >
        <div
          :class="[
            'w-full text-left px-3 py-2.5 rounded-lg transition flex items-center gap-3',
            selectedListId === list.id 
              ? 'bg-neuro-primary/20 text-neuro-primary' 
              : 'hover:bg-white/10'
          ]"
          draggable="true"
          @dragstart="handleDragStart($event, list)"
          @dragover.prevent
          @drop="handleDrop($event, list)"
        >
          <div 
            class="w-5 h-5 rounded-full flex-shrink-0 cursor-grab opacity-50 group-hover:opacity-100 hover:opacity-100"
            :style="{ backgroundColor: list.color || '#666' }"
          />
          <button
            class="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition"
            draggable="false"
            @click.stop="handleDragStart($event, list)"
          >
            <Icon name="ph:dots-six-vertical" class="w-4 h-4" />
          </button>
          <div class="flex-1 min-w-0" @click="$emit('select-list', list.id)">
            <div class="font-medium truncate">{{ list.name }}</div>
            <div class="text-xs opacity-60">{{ list._count?.items || 0 }} 本</div>
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <button
              class="p-1.5 rounded hover:bg-white/10 transition"
              title="编辑"
              @click.stop="$emit('edit-list', list)"
            >
              <Icon name="ph:pencil-simple" class="w-4 h-4" />
            </button>
            <button
              v-if="!list.isDefault"
              class="p-1.5 rounded hover:bg-red-500/20 hover:text-red-400 transition"
              title="删除"
              @click.stop="handleDelete(list)"
            >
              <Icon name="ph:trash" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="bookLists.length === 0" class="text-center py-8 text-white/40">
      <Icon name="ph:folder-open" class="w-12 h-12 mx-auto mb-2 opacity-50" />
      <p class="text-sm">还没有创建书单</p>
      <button
        class="mt-2 text-neuro-primary text-sm hover:underline"
        @click="$emit('create-list')"
      >
        立即创建
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface BookList {
  id: number
  name: string
  description?: string
  color?: string
  isDefault: boolean
  sortOrder: number
  _count?: {
    items: number
  }
}

const props = defineProps<{
  bookLists: BookList[]
  selectedListId: number | null
  totalCount: number
}>()

const emit = defineEmits<{
  'create-list': []
  'edit-list': [list: BookList]
  'delete-list': [id: number]
  'select-list': [id: number | null]
  'reorder': [items: Array<{ id: number; sortOrder: number}>]
}>()

const toast = useToast()
const draggedList = ref<BookList | null>(null)

const handleDragStart = (e: DragEvent, list: BookList) => {
  draggedList.value = list
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
  }
}

const handleDrop = (e: DragEvent, targetList: BookList) => {
  if (!draggedList.value || draggedList.value.id === targetList.id) return

  const lists = [...props.bookLists]
  const draggedIndex = lists.findIndex(l => l.id === draggedList.value!.id)
  const targetIndex = lists.findIndex(l => l.id === targetList.id)

  const [removed] = lists.splice(draggedIndex, 1)
  lists.splice(targetIndex, 0, removed)

  const reorderItems = lists.map((list, index) => ({
    id: list.id,
    sortOrder: index + 1
  }))

  emit('reorder', reorderItems)
  draggedList.value = null
}

const handleDelete = async (list: BookList) => {
  if (!confirm(`确定要删除书单「${list.name}」吗？书单内的小说不会被删除。`)) {
    return
  }
  emit('delete-list', list.id)
}
</script>
