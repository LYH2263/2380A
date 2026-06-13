<template>
  <Transition
    enter-active-class="transition duration-300"
    enter-from-class="opacity-0 translate-y-full"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-200"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-full"
  >
    <div 
      v-if="visible"
      class="fixed bottom-0 left-0 right-0 z-40 glass border-t border-white/10 px-4 py-4"
    >
      <div class="container mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-4">
          <span class="text-sm">
            已选择 <span class="text-neuro-primary font-bold">{{ selectedCount }}</span> 本
          </span>
          <button
            class="text-sm text-white/60 hover:text-white transition"
            @click="$emit('select-all')"
          >
            {{ allSelected ? '取消全选' : '全选' }}
          </button>
          <button
            class="text-sm text-white/60 hover:text-white transition"
            @click="$emit('clear-selection')"
          >
            清空选择
          </button>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <button
            class="px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition flex items-center gap-2"
            @click="showListModal = true"
          >
            <Icon name="ph:folder-plus" class="w-4 h-4" />
            添加到书单
          </button>
          
          <button
            class="px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition flex items-center gap-2"
            @click="$emit('batch-action', 'mark_reading')"
          >
            <Icon name="ph:book-open" class="w-4 h-4" />
            标记在读
          </button>
          
          <button
            class="px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition flex items-center gap-2"
            @click="$emit('batch-action', 'mark_finished')"
          >
            <Icon name="ph:check-circle" class="w-4 h-4 text-green-400" />
            标记已读
          </button>
          
          <button
            class="px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition flex items-center gap-2"
            @click="$emit('batch-action', 'mark_unread')"
          >
            <Icon name="ph:circle" class="w-4 h-4" />
            标记未读
          </button>
          
          <button
            class="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition flex items-center gap-2"
            @click="handleRemove"
          >
            <Icon name="ph:trash" class="w-4 h-4" />
            移出书架
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <div 
    v-if="showListModal"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    @click="showListModal = false"
  >
    <div 
      class="glass rounded-2xl p-6 w-full max-w-sm"
      @click.stop
    >
      <h3 class="font-bold text-lg mb-4">选择书单</h3>
      
      <div v-if="bookLists.length === 0" class="text-center py-6 text-white/40">
        <p>还没有创建书单</p>
        <button
          class="mt-2 text-neuro-primary text-sm hover:underline"
          @click="$emit('create-list'); showListModal = false"
        >
          立即创建
        </button>
      </div>
      
      <div v-else class="space-y-2 max-h-64 overflow-y-auto">
        <label
          v-for="list in bookLists"
          :key="list.id"
          class="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition cursor-pointer"
        >
          <input
            type="checkbox"
            v-model="selectedListIds"
            :value="list.id"
            class="w-4 h-4 rounded border-white/30 bg-white/10 text-neuro-primary focus:ring-neuro-primary"
          />
          <div 
            class="w-3 h-3 rounded-full flex-shrink-0"
            :style="{ backgroundColor: list.color || '#666' }"
          />
          <span>{{ list.name }}</span>
          <span class="ml-auto text-xs text-white/40">{{ list._count?.items || 0 }} 本</span>
        </label>
      </div>
      
      <div class="flex gap-3 mt-6">
        <button
          class="btn-secondary flex-1"
          @click="showListModal = false"
        >
          取消
        </button>
        <button
          class="btn-primary flex-1"
          :disabled="selectedListIds.length === 0"
          @click="handleAddToLists"
        >
          确认添加
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface BookList {
  id: number
  name: string
  color?: string
  _count?: {
    items: number
  }
}

const props = defineProps<{
  visible: boolean
  selectedCount: number
  totalCount: number
  bookLists: BookList[]
}>()

const emit = defineEmits<{
  'select-all': []
  'clear-selection': []
  'batch-action': [action: string]
  'add-to-lists': [listIds: number[]]
  'create-list': []
}>()

const allSelected = computed(() => props.selectedCount === props.totalCount && props.totalCount > 0)
const showListModal = ref(false)
const selectedListIds = ref<number[]>([])

watch(() => showListModal.value, (val) => {
  if (!val) {
    selectedListIds.value = []
  }
})

const handleRemove = () => {
  if (!confirm(`确定要将选中的 ${props.selectedCount} 本小说移出书架吗？`)) {
    return
  }
  emit('batch-action', 'remove')
}

const handleAddToLists = () => {
  emit('add-to-lists', selectedListIds.value)
  showListModal.value = false
}
</script>
