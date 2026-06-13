<template>
  <div :class="['p-4 glass rounded-xl', isReply ? 'bg-white/5' : '']">
    <div class="flex items-start gap-3">
      <img
        :src="comment.user.avatar"
        :alt="comment.user.username"
        :class="['rounded-full flex-shrink-0', isReply ? 'w-6 h-6' : 'w-10 h-10']"
      />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1 flex-wrap">
          <NuxtLink
            :to="`/user/${comment.user.username}`"
            class="font-medium hover:text-neuro-primary transition"
          >
            {{ comment.user.username }}
          </NuxtLink>
          <span class="text-xs opacity-50">{{ formatDate(comment.createdAt) }}</span>
          <span v-if="comment.isEdited" class="text-xs opacity-50 italic">已编辑</span>
        </div>

        <div v-if="editing" class="mb-2">
          <FormTextarea
            v-model="editContent"
            :rows="3"
            class="text-sm"
          />
          <div class="flex gap-2 mt-2">
            <Button
              @click="saveEdit"
              :loading="editLoading"
              variant="primary"
              size="sm"
            >
              保存
            </Button>
            <Button
              @click="cancelEdit"
              size="sm"
            >
              取消
            </Button>
          </div>
        </div>
        <p v-else class="opacity-80 whitespace-pre-wrap" v-html="renderedContent"></p>

        <div class="flex items-center gap-4 mt-2 text-sm">
          <button
            @click="handleLike"
            :class="[
              'flex items-center gap-1 transition',
              comment.isLiked ? 'text-neuro-primary' : 'opacity-60 hover:opacity-100'
            ]"
            :disabled="likeLoading"
          >
            <Icon :name="comment.isLiked ? 'ph:heart-fill' : 'ph:heart'" />
            <span>{{ comment.likeCount || 0 }}</span>
          </button>

          <button
            v-if="!isReply"
            @click="showReply = !showReply"
            class="flex items-center gap-1 opacity-60 hover:opacity-100 transition"
          >
            <Icon name="ph:chat-circle-dots" />
            <span>回复 {{ comment.replyCount || 0 }}</span>
          </button>

          <button
            v-if="canEdit && !editing"
            @click="startEdit"
            class="flex items-center gap-1 opacity-60 hover:opacity-100 transition"
          >
            <Icon name="ph:pencil" />
            <span>编辑</span>
          </button>

          <button
            v-if="canDelete && !editing"
            @click="handleDelete"
            class="flex items-center gap-1 opacity-60 hover:text-red-400 transition"
          >
            <Icon name="ph:trash" />
            <span>删除</span>
          </button>

          <div class="relative" ref="reportMenuRef">
            <button
              v-if="user && user.id !== comment.user.id && !editing"
              @click="showReportMenu = !showReportMenu"
              class="flex items-center gap-1 opacity-60 hover:opacity-100 transition"
            >
              <Icon name="ph:flag" />
              <span>举报</span>
            </button>

            <Transition
              enter-active-class="transition duration-200"
              enter-from-class="opacity-0 scale-95"
              enter-to-class="opacity-100 scale-100"
              leave-active-class="transition duration-150"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div
                v-if="showReportMenu"
                class="absolute right-0 top-full mt-1 w-48 glass rounded-xl p-2 z-20 shadow-xl"
              >
                <button
                  v-for="type in reportTypes"
                  :key="type.value"
                  @click="submitReport(type.value)"
                  class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition text-sm"
                >
                  {{ type.label }}
                </button>
              </div>
            </Transition>
          </div>
        </div>

        <Transition
          enter-active-class="transition duration-200"
          enter-from-class="opacity-0 translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-150"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-2"
        >
          <div v-if="showReply && user" class="mt-3 pl-4 border-l-2 border-white/10">
            <div class="flex gap-2">
              <input
                v-model="replyContent"
                type="text"
                :placeholder="`回复 @${comment.user.username}...`"
                class="input-field text-sm py-2 flex-1"
                @keyup.enter="submitReply"
              />
              <Button
                @click="submitReply"
                :loading="replyLoading"
                variant="primary"
                size="sm"
              >
                发送
              </Button>
            </div>
          </div>
        </Transition>

        <div v-if="comment.replies?.length" class="mt-3 space-y-2 pl-4 border-l-2 border-white/10">
          <CommentItem
            v-for="reply in comment.replies"
            :key="reply.id"
            :comment="reply"
            :is-reply="true"
            :chapter-id="chapterId"
            @refresh="$emit('refresh')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  comment: any
  isReply?: boolean
  chapterId: string | number
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const { user } = useAuth()
const toast = useToast()
const { renderContentWithMentions, canEditComment } = useCommentUtils()

const likeLoading = ref(false)
const replyLoading = ref(false)
const editLoading = ref(false)
const reportLoading = ref(false)
const showReply = ref(false)
const showReportMenu = ref(false)
const editing = ref(false)
const editContent = ref('')
const replyContent = ref('')
const reportMenuRef = ref<HTMLElement | null>(null)

const reportTypes = [
  { value: 'SPAM', label: '垃圾广告' },
  { value: 'HARASSMENT', label: '骚扰攻击' },
  { value: 'HATE_SPEECH', label: '仇恨言论' },
  { value: 'EXPLICIT_CONTENT', label: '色情内容' },
  { value: 'OTHER', label: '其他原因' }
]

const canEdit = computed(() => {
  if (!user.value || user.value.id !== props.comment.userId) return false
  return canEditComment(props.comment.createdAt)
})

const canDelete = computed(() => {
  if (!user.value) return false
  return user.value.id === props.comment.userId || user.value.role === 'ADMIN'
})

const renderedContent = computed(() => {
  return renderContentWithMentions(props.comment.content)
})

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleLike = async () => {
  if (!user.value) {
    toast.error('请先登录')
    return
  }
  likeLoading.value = true
  try {
    const data = await $fetch(`/api/comments/${props.comment.id}/like`, {
      method: 'POST'
    })
    props.comment.isLiked = data.liked
    props.comment.likeCount = (props.comment.likeCount || 0) + (data.liked ? 1 : -1)
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  } finally {
    likeLoading.value = false
  }
}

const submitReply = async () => {
  if (!replyContent.value.trim()) return

  const content = `@${props.comment.user.username} ${replyContent.value.trim()}`
  replyLoading.value = true
  try {
    await $fetch(`/api/chapters/${props.chapterId}/comments`, {
      method: 'POST',
      body: {
        content,
        parentId: props.comment.id
      }
    })
    replyContent.value = ''
    showReply.value = false
    emit('refresh')
    toast.success('回复成功')
  } catch (e: any) {
    toast.error(e.message || '回复失败')
  } finally {
    replyLoading.value = false
  }
}

const startEdit = () => {
  editing.value = true
  editContent.value = props.comment.content
}

const cancelEdit = () => {
  editing.value = false
  editContent.value = ''
}

const saveEdit = async () => {
  if (!editContent.value.trim()) return
  editLoading.value = true
  try {
    const data = await $fetch(`/api/comments/${props.comment.id}`, {
      method: 'PUT',
      body: { content: editContent.value }
    })
    props.comment.content = data.comment.content
    props.comment.isEdited = true
    editing.value = false
    editContent.value = ''
    toast.success('编辑成功')
  } catch (e: any) {
    toast.error(e.message || '编辑失败')
  } finally {
    editLoading.value = false
  }
}

const handleDelete = async () => {
  if (!confirm('确定要删除这条评论吗？')) return
  try {
    await $fetch(`/api/comments/${props.comment.id}`, {
      method: 'DELETE'
    })
    emit('refresh')
    toast.success('删除成功')
  } catch (e: any) {
    toast.error(e.message || '删除失败')
  }
}

const submitReport = async (type: string) => {
  showReportMenu.value = false
  const reason = prompt('请简要说明举报理由：')
  if (!reason?.trim()) return

  reportLoading.value = true
  try {
    await $fetch(`/api/comments/${props.comment.id}/report`, {
      method: 'POST',
      body: { type, reason }
    })
    toast.success('举报已提交，我们会尽快处理')
  } catch (e: any) {
    toast.error(e.message || '举报失败')
  } finally {
    reportLoading.value = false
  }
}

onClickOutside(reportMenuRef, () => {
  showReportMenu.value = false
})
</script>
