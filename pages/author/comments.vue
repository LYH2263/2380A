<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2">评论管理</h1>
      <p class="text-white/60">管理您作品收到的读者评论和互动</p>
    </div>

    <div class="flex flex-wrap items-center gap-4 mb-6">
      <div class="flex items-center gap-2">
        <label class="text-sm text-white/60">作品筛选：</label>
        <select v-model="filterNovelId" class="input-field text-sm py-1.5 px-3">
          <option value="">全部作品</option>
          <option v-for="n in availableNovels" :key="n.id" :value="n.id">
            {{ n.title }}
          </option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <label class="inline-flex items-center gap-2 text-sm text-white/70 cursor-pointer">
          <input type="checkbox" v-model="onlyUnreplied" class="w-4 h-4" />
          只看未回复
        </label>
      </div>
    </div>

    <div class="space-y-4">
      <div v-if="!comments.length && !loading" class="card p-12 text-center text-white/50">
        <Icon name="ph:chat-circle-dots" class="text-4xl mb-4" />
        <p>暂无评论</p>
      </div>

      <TransitionGroup
        tag="div"
        class="space-y-4"
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-for="comment in comments"
          :key="comment.id"
          class="card overflow-hidden"
        >
          <div class="p-5">
            <div class="flex items-start gap-4">
              <img
                :src="comment.user?.avatar || defaultAvatar"
                :alt="comment.user?.username"
                class="w-10 h-10 rounded-full flex-shrink-0"
              />

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <span class="font-medium">{{ comment.user?.username || '匿名用户' }}</span>

                  <span v-if="comment.isPinned" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
                    <Icon name="ph:pin" class="w-3 h-3" />
                    置顶
                  </span>
                  <span v-if="comment.isFeatured" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-neuro-primary/20 text-neuro-primary">
                    <Icon name="ph:star" class="w-3 h-3" />
                    精选
                  </span>

                  <span v-if="comment.novel" class="text-xs text-white/40 truncate max-w-xs">
                    · {{ comment.novel.title }} · 第{{ comment.chapter?.order }}章 {{ comment.chapter?.title }}
                  </span>
                </div>

                <p class="text-sm text-white/60 mb-2">
                  {{ formatDate(comment.createdAt) }}
                </p>

                <div class="text-white/90 whitespace-pre-wrap break-words leading-relaxed">
                  {{ comment.content }}
                </div>

                <div class="flex items-center gap-4 mt-3 text-sm text-white/50">
                  <span class="flex items-center gap-1">
                    <Icon name="ph:heart" class="w-4 h-4" />
                    {{ comment._count?.likes || 0 }}
                  </span>
                </div>

                <div class="flex items-center gap-2 mt-4 flex-wrap">
                  <button
                    @click="togglePin(comment)"
                    :class="[
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition',
                      comment.isPinned
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    ]"
                  >
                    <Icon name="ph:pin" class="w-4 h-4" />
                    {{ comment.isPinned ? '取消置顶' : '置顶' }}
                  </button>

                  <button
                    @click="toggleFeature(comment)"
                    :class="[
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition',
                      comment.isFeatured
                        ? 'bg-neuro-primary/20 text-neuro-primary hover:bg-neuro-primary/30'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    ]"
                  >
                    <Icon name="ph:star" class="w-4 h-4" />
                    {{ comment.isFeatured ? '取消精选' : '设为精选' }}
                  </button>

                  <button
                    @click="startReply(comment)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-white/5 text-white/70 hover:bg-white/10 transition"
                  >
                    <Icon name="ph:reply" class="w-4 h-4" />
                    回复
                  </button>
                </div>

                <Transition
                  enter-active-class="transition duration-200"
                  enter-from-class="opacity-0 max-h-0"
                  enter-to-class="opacity-100 max-h-64"
                  leave-active-class="transition duration-150"
                  leave-from-class="opacity-100 max-h-64"
                  leave-to-class="opacity-0 max-h-0"
                >
                  <div v-if="replyingTo === comment.id" class="mt-4 bg-white/5 rounded-lg p-4 overflow-hidden">
                    <FormTextarea
                      v-model="replyContent"
                      label="您的回复"
                      :rows="3"
                      placeholder="回复读者..."
                    />
                    <div class="flex justify-end gap-2 mt-3">
                      <Button @click="replyingTo = null" variant="secondary" size="sm">取消</Button>
                      <Button @click="submitReply(comment)" variant="primary" size="sm" :loading="replyLoading">
                        发送回复
                      </Button>
                    </div>
                  </div>
                </Transition>

                <div v-if="comment.replies?.length" class="mt-4 space-y-3 border-l-2 border-white/10 pl-4">
                  <div
                    v-for="reply in comment.replies"
                    :key="reply.id"
                    class="flex items-start gap-3"
                  >
                    <img
                      :src="reply.user?.avatar || defaultAvatar"
                      :alt="reply.user?.username"
                      class="w-8 h-8 rounded-full flex-shrink-0"
                    />
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="font-medium text-sm">{{ reply.user?.username }}</span>
                        <span class="text-xs text-white/40">{{ formatDate(reply.createdAt) }}</span>
                      </div>
                      <p class="text-sm text-white/80 whitespace-pre-wrap break-words">
                        {{ reply.content }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <div v-if="pagination && pagination.totalPages > 1" class="mt-8 flex justify-center gap-2">
      <button
        @click="page--"
        :disabled="page <= 1 || loading"
        class="btn-secondary px-4 py-2 disabled:opacity-50"
      >
        上一页
      </button>
      <span class="px-4 py-2 text-white/70">
        {{ page }} / {{ pagination.totalPages }}
      </span>
      <button
        @click="page++"
        :disabled="page >= pagination.totalPages || loading"
        class="btn-secondary px-4 py-2 disabled:opacity-50"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'author',
  middleware: 'author'
})

const toast = useToast()

const loading = ref(false)
const page = ref(1)
const filterNovelId = ref<number | ''>('')
const onlyUnreplied = ref(false)
const replyingTo = ref<number | null>(null)
const replyContent = ref('')
const replyLoading = ref(false)

const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iIzJEMkQ0RSIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMTYiIHI9IjYiIGZpbGw9IiM1NkU1Q0YiLz48cGF0aCBkPSJNMjAgMjJDMTQgMjIgMTAgMjYgMTAgMzBDMTAgMzQgMTQgMzggMjAgMzhDMjYgMzggMzAgMzQgMzAgMzBDMzAgMjYgMjYgMjIgMjAgMjJaIiBmaWxsPSIjNTZFNUNCIi8+PC9zdmc+'

const { data, refresh } = await useFetch('/api/author/comments', {
  query: computed(() => ({
    page: page.value,
    limit: 10,
    ...(filterNovelId.value ? { novelId: filterNovelId.value } : {}),
    ...(onlyUnreplied.value ? { onlyUnreplied: 'true' } : {})
  })),
  watch: [page, filterNovelId, onlyUnreplied],
  onRequest: () => { loading.value = true },
  onResponse: () => { loading.value = false }
})

const comments = computed(() => data.value?.comments || [])
const pagination = computed(() => data.value?.pagination)
const availableNovels = computed(() => data.value?.novels || [])

const formatDate = (d: any) => {
  if (!d) return ''
  const date = new Date(d)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  if (hrs < 24) return `${hrs} 小时前`
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString('zh-CN')
}

const startReply = (comment: any) => {
  replyingTo.value = comment.id
  replyContent.value = ''
  nextTick(() => {
    const textarea = document.querySelector(`textarea`) as HTMLTextAreaElement
    textarea?.focus()
  })
}

const submitReply = async (comment: any) => {
  if (!replyContent.value.trim()) {
    toast.warning('请输入回复内容')
    return
  }
  replyLoading.value = true
  try {
    await $fetch(`/api/author/comments/${comment.id}/reply`, {
      method: 'POST',
      body: { content: replyContent.value }
    })
    toast.success('回复成功')
    replyingTo.value = null
    replyContent.value = ''
    await refresh()
  } catch (e: any) {
    toast.error(e.message || '回复失败')
  } finally {
    replyLoading.value = false
  }
}

const togglePin = async (comment: any) => {
  try {
    await $fetch(`/api/author/comments/${comment.id}/action`, {
      method: 'POST',
      body: { action: comment.isPinned ? 'unpin' : 'pin' }
    })
    toast.success(comment.isPinned ? '已取消置顶' : '已置顶')
    await refresh()
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  }
}

const toggleFeature = async (comment: any) => {
  try {
    await $fetch(`/api/author/comments/${comment.id}/action`, {
      method: 'POST',
      body: { action: comment.isFeatured ? 'unfeature' : 'feature' }
    })
    toast.success(comment.isFeatured ? '已取消精选' : '已设为精选')
    await refresh()
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  }
}

useHead({
  title: '评论管理 - 作者中心'
})
</script>
