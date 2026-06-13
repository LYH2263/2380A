<template>
  <div 
    v-if="visible"
    class="fixed inset-0 bg-transparent z-50"
    @click="handleClose"
  >
    <div 
      class="absolute glass rounded-xl p-2 min-w-[160px] shadow-2xl border border-white/10"
      :style="{ left: position.x + 'px', top: position.y + 'px' }"
      @click.stop
    >
      <button
        v-if="item.lastChapterId"
        class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition flex items-center gap-2 text-sm"
        @click="handleAction('continue')"
      >
        <Icon name="ph:play" class="w-4 h-4 text-neuro-primary" />
        继续阅读
      </button>
      
      <div class="h-px bg-white/10 my-1" />
      
      <button
        class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition flex items-center gap-2 text-sm"
        @click="handleAction('add_to_list')"
      >
        <Icon name="ph:folder-plus" class="w-4 h-4" />
        添加到书单
      </button>

      <div class="h-px bg-white/10 my-1" />
      
      <button
        class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition flex items-center gap-2 text-sm"
        @click="handleAction('mark_reading')"
      >
        <Icon name="ph:book-open" class="w-4 h-4" />
        标记为在读
      </button>
      
      <button
        class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition flex items-center gap-2 text-sm"
        @click="handleAction('mark_finished')"
      >
        <Icon name="ph:check-circle" class="w-4 h-4 text-green-400" />
        标记为已读
      </button>
      
      <button
        class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition flex items-center gap-2 text-sm"
        @click="handleAction('mark_unread')"
      >
        <Icon name="ph:circle" class="w-4 h-4" />
        标记为未读
      </button>
      
      <div class="h-px bg-white/10 my-1" />
      
      <button
        class="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition flex items-center gap-2 text-sm"
        @click="handleAction('remove')"
      >
        <Icon name="ph:trash" class="w-4 h-4" />
        移出书架
      </button>
    </div>

    <div 
      v-if="showListSelector"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click="showListSelector = false"
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
            @click="$emit('create-list'); showListSelector = false"
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
              :checked="selectedListIds.includes(list.id)"
              @change="toggleListSelection(list.id)"
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
            @click="showListSelector = false"
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

interface BookItem {
  id: number
  novelId: number
  lastChapterId?: number
  novel: {
    id: number
    title: string
  }
}

const props = defineProps<{
  visible: boolean
  item: BookItem | null
  position: { x: number; y: number }
  bookLists: BookList[]
}>()

const emit = defineEmits<{
  close: []
  action: [action: string, item: BookItem]
  'add-to-lists': [item: BookItem, listIds: number[]]
  'create-list': []
}>()

const showListSelector = ref(false)
const selectedListIds = ref<number[]>([])

watch(() => props.visible, (val) => {
  if (!val) {
    showListSelector.value = false
    selectedListIds.value = []
  }
})

const handleClose = () => {
  emit('close')
}

const toggleListSelection = (id: number) => {
  const index = selectedListIds.value.indexOf(id)
  if (index > -1) {
    selectedListIds.value.splice(index, 1)
  } else {
    selectedListIds.value.push(id)
  }
}

const handleAction = (action: string) => {
  if (!props.item) return
  
  if (action === 'add_to_list') {
    const currentLists = props.item.bookListItems?.map((bli: any) => bli.bookList.id) || []
    selectedListIds.value = [...currentLists]
    showListSelector.value = true
    return
  }
  
  if (action === 'remove') {
    if (!confirm(`确定要将「${props.item.novel.title}」移出书架吗？`)) {
      return
    }
  }
  
  emit('action', action, props.item)
  handleClose()
}

const handleAddToLists = () => {
  if (!props.item) return
  emit('add-to-lists', props.item, selectedListIds.value)
  showListSelector.value = false
  handleClose()
}
</script>
