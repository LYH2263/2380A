<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-5xl mx-auto px-4">
      <div v-if="loading" class="flex justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>

      <div v-else-if="error" class="text-center py-20">
        <div class="text-6xl mb-4">😢</div>
        <h2 class="text-2xl font-bold mb-2">链接已失效</h2>
        <p class="text-gray-500">{{ error }}</p>
      </div>

      <div v-else-if="shareData" class="space-y-6">
        <!-- 头部信息 -->
        <div class="bg-white rounded-xl shadow-sm p-6">
          <div class="flex items-start gap-4">
            <div class="text-5xl">{{ shareData.type === 'BOOKSHELF' ? '📚' : '📖' }}</div>
            <div class="flex-1">
              <h1 class="text-2xl font-bold mb-1">
                {{ shareData.type === 'BOOKSHELF' ? `${shareData.username} 的书架` : (shareData as any).name }}
              </h1>
              <p class="text-sm text-gray-500 mb-2">
                由 <span class="text-blue-500">{{ shareData.username }}</span> 分享
                 · 共 {{ shareData.totalBooks }} 本
                 · 分享于 {{ formatDate(shareData.createdAt) }}
              </p>
              <p v-if="(shareData as any).description" class="text-gray-600 text-sm">
                {{ (shareData as any).description }}
              </p>
            </div>
            <button
              @click="navigateTo('/')"
              class="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>

        <!-- 书籍网格 -->
        <div>
          <div v-if="shareData.books.length === 0" class="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
            暂无书籍
          </div>
          <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div
              v-for="book in shareData.books"
              :key="book.id"
              class="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
              @click="navigateTo(`/novels/${book.id}`)"
            >
              <div class="aspect-[3/4] bg-gray-100 relative overflow-hidden">
                <img
                  v-if="book.cover"
                  :src="book.cover"
                  :alt="book.title"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                  <Icon name="ph:book-open" class="w-10 h-10" />
                </div>
              </div>
              <div class="p-3">
                <h3 class="font-medium text-sm line-clamp-2 mb-1 group-hover:text-blue-500 transition-colors">
                  {{ book.title }}
                </h3>
                <p class="text-xs text-gray-500 truncate">{{ book.author }}</p>
                <div class="mt-2 flex items-center justify-between text-xs">
                  <span
                    :class="[
                      'px-1.5 py-0.5 rounded',
                      statusColor(book.status)
                    ]"
                  >
                    {{ statusName(book.status) }}
                  </span>
                  <span v-if="(book as any).readingStatus" class="text-gray-400">
                    {{ readingStatusName((book as any).readingStatus) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部提示 -->
        <div class="text-center py-8">
          <p class="text-sm text-gray-400">
            喜欢这些书？快来 {{ appName }} 建立你自己的书架吧 📚
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ShareBook {
  id: number
  title: string
  cover: string | null
  author: string
  status: string
  readingStatus?: string
  progress?: number
  addedAt: string
}

interface ShareData {
  type: 'BOOKSHELF' | 'BOOKLIST'
  userId: number
  username: string
  books: ShareBook[]
  totalBooks: number
  createdAt: string
  name?: string
  description?: string
}

const config = useRuntimeConfig()
const appName = computed(() => config.public.appName)

const token = computed(() => getRouterParam(useRoute(), 'token'))
const loading = ref(true)
const error = ref('')
const shareData = ref<ShareData | null>(null)

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    ONGOING: 'bg-green-100 text-green-700',
    COMPLETED: 'bg-blue-100 text-blue-700',
    HIATUS: 'bg-gray-100 text-gray-600'
  }
  return map[status] || 'bg-gray-100 text-gray-600'
}

function statusName(status: string): string {
  const map: Record<string, string> = {
    ONGOING: '连载中',
    COMPLETED: '已完结',
    HIATUS: '暂停'
  }
  return map[status] || status
}

function readingStatusName(status: string): string {
  const map: Record<string, string> = {
    UNREAD: '未读',
    READING: '在读',
    FINISHED: '已读'
  }
  return map[status] || status
}

async function loadShare() {
  loading.value = true
  error.value = ''
  try {
    const { data, error: fetchError } = await useFetch(`/api/share/view/${token.value}`)
    if (fetchError.value) {
      error.value = fetchError.value.data?.message || '加载失败'
      return
    }
    shareData.value = data.value?.data
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

useHead({
  title: computed(() => shareData.value
    ? `${shareData.value.type === 'BOOKSHELF' ? `${shareData.value.username} 的书架` : (shareData.value as any).name} - ${appName.value}`
    : `分享 - ${appName.value}`
  )
})

onMounted(loadShare)
</script>
