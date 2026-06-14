<template>
  <div 
    :class="[
      'group relative transition-all duration-200',
      containerClasses
    ]"
    @mouseenter="showActions = true"
    @mouseleave="showActions = false"
  >
    <div 
      v-if="selectMode"
      class="absolute top-2 left-2 z-20"
      @click.stop
    >
      <button
        :class="[
          'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
          selected 
            ? 'bg-neuro-primary border-neuro-primary text-white' 
            : 'bg-black/50 border-white/30 hover:border-white/60'
        ]"
        @click="$emit('toggle-select', item.id)"
      >
        <Icon v-if="selected" name="ph:check" class="w-4 h-4" />
      </button>
    </div>

    <div 
      v-if="item.hasNewUpdate"
      class="absolute top-2 right-2 z-10 w-3 h-3 bg-red-500 rounded-full animate-pulse"
      title="有新更新"
    />

    <div 
      v-if="viewMode === 'grid'"
      class="card overflow-hidden h-full"
    >
      <NuxtLink 
        :to="`/novels/${item.novel.id}`"
        class="block"
        @click="handleBookClick"
      >
        <div class="relative aspect-[3/4] overflow-hidden">
          <img 
            :src="item.novel.cover || defaultCover" 
            :alt="item.novel.title"
            class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
          <div 
            :class="[
              'absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-medium',
              statusClasses[item.novel.status]
            ]"
          >
            {{ statusLabels[item.novel.status] }}
          </div>

          <div 
            v-if="item.readingStatus !== 'UNREAD'"
            class="absolute bottom-0 left-0 right-0 h-1 bg-white/20"
          >
            <div 
              class="h-full bg-gradient-to-r from-neuro-primary to-neuro-secondary transition-all"
              :style="{ width: (item.novel.progress || item.progress || 0) + '%' }"
            />
          </div>
        </div>

        <div class="p-3">
          <h3 class="font-bold text-sm mb-1 line-clamp-1 group-hover:text-neuro-primary transition">
            {{ item.novel.title }}
          </h3>
          <p class="text-white/50 text-xs mb-2">
            {{ item.novel.author?.username }}
          </p>
          
          <div v-if="item.lastReadAt" class="text-xs text-white/40">
            上次阅读: {{ formatRelativeTime(item.lastReadAt) }}
          </div>
          <div v-else class="text-xs text-white/40">
            收藏于: {{ formatRelativeTime(item.createdAt) }}
          </div>

          <div v-if="item.novel.progress > 0" class="mt-2 text-xs">
            <span class="text-neuro-primary font-medium">
              {{ item.novel.progress }}%
            </span>
            <span class="text-white/40"> 已读</span>
          </div>
        </div>
      </NuxtLink>

      <div 
        v-if="item.bookListItems?.length > 0"
        class="px-3 pb-3 flex flex-wrap gap-1"
      >
        <span 
          v-for="bli in item.bookListItems" 
          :key="bli.bookList.id"
          :style="{ backgroundColor: bli.bookList.color + '30', color: bli.bookList.color }"
          class="px-2 py-0.5 rounded-full text-xs"
        >
          {{ bli.bookList.name }}
        </span>
      </div>

      <div 
        v-if="showActions && !selectMode"
        class="absolute bottom-0 left-0 right-0 p-3 glass border-t border-white/10 flex gap-2"
      >
        <button
          v-if="item.lastChapterId"
          class="flex-1 px-3 py-1.5 bg-gradient-to-r from-neuro-primary to-neuro-secondary rounded-lg text-xs font-medium hover:opacity-90 transition"
          @click.stop="handleContinueReading"
        >
          继续阅读
        </button>
        <button
          class="px-3 py-1.5 bg-white/10 rounded-lg text-xs hover:bg-white/20 transition"
          @click.stop="handleMoreClick"
        >
          <Icon name="ph:dots-three-vertical" />
        </button>
      </div>
    </div>

    <div 
      v-else-if="viewMode === 'list'"
      class="card p-4 h-full"
    >
      <div class="flex gap-4 h-full">
        <NuxtLink 
          :to="`/novels/${item.novel.id}`"
          class="flex-shrink-0 w-20 aspect-[3/4] rounded-lg overflow-hidden"
          @click="handleBookClick"
        >
          <img 
            :src="item.novel.cover || defaultCover" 
            :alt="item.novel.title"
            class="w-full h-full object-cover"
          />
        </NuxtLink>

        <div class="flex-1 min-w-0 flex flex-col">
          <div class="flex items-start justify-between gap-2 mb-2">
            <NuxtLink 
              :to="`/novels/${item.novel.id}`"
              class="min-w-0"
              @click="handleBookClick"
            >
              <h3 class="font-bold text-base line-clamp-1 hover:text-neuro-primary transition">
                {{ item.novel.title }}
              </h3>
            </NuxtLink>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span 
                :class="[
                  'px-2 py-0.5 rounded text-xs font-medium',
                  statusClasses[item.novel.status]
                ]"
              >
                {{ statusLabels[item.novel.status] }}
              </span>
              <div 
                v-if="item.hasNewUpdate"
                class="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"
              />
            </div>
          </div>

          <p class="text-white/60 text-sm line-clamp-2 mb-2">
            {{ item.novel.description }}
          </p>

          <div class="flex items-center gap-4 text-sm text-white/50 mb-2">
            <span class="flex items-center gap-1">
              <Icon name="ph:user" class="w-4 h-4" />
              {{ item.novel.author?.username }}
            </span>
            <span class="flex items-center gap-1">
              <Icon name="ph:book-open" class="w-4 h-4" />
              {{ item.novel._count?.chapters || 0 }} 章
            </span>
            <span class="flex items-center gap-1">
              <Icon name="ph:eye" class="w-4 h-4" />
              {{ formatNumber(item.novel.viewCount) }}
            </span>
          </div>

          <div class="flex items-center gap-4 mb-2">
            <div class="flex-1">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-white/40">阅读进度</span>
                <span class="text-neuro-primary font-medium">
                  {{ item.novel.progress || item.progress || 0 }}%
                </span>
              </div>
              <div class="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-neuro-primary to-neuro-secondary transition-all"
                  :style="{ width: (item.novel.progress || item.progress || 0) + '%' }"
                />
              </div>
            </div>
          </div>

          <div v-if="item.lastReadAt" class="text-xs text-white/40 mb-2">
            上次阅读: {{ formatTime(item.lastReadAt) }}
            <span v-if="item.lastChapterId" class="ml-2">
              · 章节 {{ item.novel.lastChapterOrder || '-' }}
            </span>
          </div>

          <div v-if="item.bookListItems?.length > 0" class="flex flex-wrap gap-1 mb-2">
            <span 
              v-for="bli in item.bookListItems" 
              :key="bli.bookList.id"
              :style="{ backgroundColor: bli.bookList.color + '30', color: bli.bookList.color }"
              class="px-2 py-0.5 rounded-full text-xs"
            >
              {{ bli.bookList.name }}
            </span>
          </div>

          <div class="flex gap-2 mt-auto">
            <button
              v-if="item.lastChapterId"
              class="px-4 py-1.5 bg-gradient-to-r from-neuro-primary to-neuro-secondary rounded-lg text-sm font-medium hover:opacity-90 transition"
              @click="handleContinueReading"
            >
              <Icon name="ph:play" class="w-4 h-4 mr-1" />
              继续阅读
            </button>
            <button
              class="px-3 py-1.5 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition"
              @click="handleMoreClick"
            >
              <Icon name="ph:dots-three-vertical" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div 
      v-else
      class="card p-3 flex items-center gap-3 hover:bg-white/5 transition"
    >
      <NuxtLink 
        :to="`/novels/${item.novel.id}`"
        class="flex-shrink-0 w-10 h-14 rounded overflow-hidden"
        @click="handleBookClick"
      >
        <img 
          :src="item.novel.cover || defaultCover" 
          :alt="item.novel.title"
          class="w-full h-full object-cover"
        />
      </NuxtLink>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h4 class="font-medium text-sm line-clamp-1 truncate">
            {{ item.novel.title }}
          </h4>
          <div 
            v-if="item.hasNewUpdate"
            class="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0"
          />
        </div>
        <div class="flex items-center gap-3 text-xs text-white/40 mt-1">
          <span>{{ item.novel.author?.username }}</span>
          <span>{{ item.novel.progress || item.progress || 0 }}%</span>
          <span v-if="item.lastReadAt">{{ formatRelativeTime(item.lastReadAt) }}</span>
        </div>
      </div>

      <div class="flex items-center gap-1">
        <button
          v-if="item.lastChapterId"
          class="p-2 rounded-lg hover:bg-white/10 transition text-neuro-primary"
          title="继续阅读"
          @click="handleContinueReading"
        >
          <Icon name="ph:play" class="w-4 h-4" />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-white/10 transition"
          @click="handleMoreClick"
        >
          <Icon name="ph:dots-three-vertical" class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface BookListItem {
  id: number
  name: string
  color?: string
}

interface BookItem {
  id: number
  novelId: number
  readingStatus: 'UNREAD' | 'READING' | 'FINISHED'
  progress: number
  lastReadAt?: string
  lastChapterId?: number
  createdAt: string
  hasNewUpdate: boolean
  novel: {
    id: number
    title: string
    description: string
    cover?: string
    status: 'ONGOING' | 'COMPLETED' | 'HIATUS'
    viewCount: number
    progress: number
    lastChapterOrder?: number
    totalChapters: number
    author?: {
      username: string
    }
    _count?: {
      chapters: number
      likes: number
    }
  }
  bookListItems?: Array<{
    bookList: BookListItem
  }>
}

const props = defineProps<{
  item: BookItem
  viewMode: 'grid' | 'list' | 'compact'
  selectMode?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  'continue-reading': [item: BookItem]
  'more': [item: BookItem, event: MouseEvent]
  'toggle-select': [id: number]
}>()

const defaultCover = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400'
const showActions = ref(false)

const statusLabels: Record<string, string> = {
  ONGOING: '连载中',
  COMPLETED: '已完结',
  HIATUS: '暂停更新'
}

const statusClasses: Record<string, string> = {
  ONGOING: 'bg-green-500/80 text-white',
  COMPLETED: 'bg-blue-500/80 text-white',
  HIATUS: 'bg-yellow-500/80 text-white'
}

const containerClasses = computed(() => {
  if (props.viewMode === 'grid') {
    return ''
  }
  if (props.viewMode === 'list') {
    return ''
  }
  return ''
})

const formatNumber = (num: number) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  if (days < 365) return `${Math.floor(days / 30)}个月前`
  return `${Math.floor(days / 365)}年前`
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / 86400000)
  
  if (days === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  if (days === 1) {
    return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const handleBookClick = () => {
  if (props.item.hasNewUpdate) {
    $fetch(`/api/user/bookshelf/${props.item.novelId}/clear-update`, {
      method: 'POST'
    }).catch(() => {})
  }
}

const handleContinueReading = () => {
  emit('continue-reading', props.item)
}

const handleMoreClick = (event: MouseEvent) => {
  emit('more', props.item, event)
}
</script>
