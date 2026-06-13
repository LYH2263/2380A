<template>
  <div>
    <div class="flex items-center gap-4 mb-8">
      <NuxtLink to="/author/novels" class="p-2 hover:bg-white/10 rounded-lg transition">
        <Icon name="ph:arrow-left" />
      </NuxtLink>
      <div class="flex-1">
        <h1 class="text-3xl font-bold">章节管理</h1>
        <p v-if="novel" class="text-white/60">{{ novel.title }}</p>
      </div>
      <Button @click="openAddModal" variant="primary">
        <Icon name="ph:plus" class="mr-2" />
        添加章节
      </Button>
    </div>

    <div class="flex items-center gap-4 mb-6">
      <div class="flex items-center gap-2">
        <button
          v-for="opt in statusOptions"
          :key="opt.value"
          @click="activeStatus = opt.value"
          :class="[
            'px-4 py-2 rounded-lg text-sm transition flex items-center gap-2',
            activeStatus === opt.value
              ? 'bg-white/10 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          ]"
        >
          <span v-if="opt.icon"><Icon :name="opt.icon" /></span>
          {{ opt.label }}
          <span v-if="statusCounts[opt.value] !== undefined" class="text-xs bg-white/10 px-2 py-0.5 rounded-full">
            {{ statusCounts[opt.value] }}
          </span>
        </button>
      </div>
    </div>

    <div class="card overflow-hidden">
      <div v-if="!filteredChapters.length && !loading" class="p-12 text-center text-white/50">
        <Icon name="ph:file-text" class="text-4xl mb-4" />
        <p>
          {{ activeStatus === '' ? '暂无章节' : `暂无${statusOptions.find(o => o.value === activeStatus)?.label}章节` }}
        </p>
        <button
          v-if="activeStatus === '' || activeStatus === 'DRAFT'"
          @click="openAddModal"
          class="btn-primary mt-4 inline-flex"
        >
          <Icon name="ph:plus" class="mr-2" />
          添加第一章
        </button>
      </div>

      <div v-else class="divide-y divide-white/10">
        <div
          v-for="chapter in filteredChapters"
          :key="chapter.id"
          class="flex items-center justify-between p-4 hover:bg-white/5 transition group"
        >
          <div class="flex items-center gap-4 flex-1 min-w-0">
            <div class="w-10 text-center">
              <span v-if="chapter.status === 'DRAFT'" class="inline-block" title="草稿">
                <Icon name="ph:pencil" class="text-yellow-400" />
              </span>
              <span v-else-if="chapter.status === 'SCHEDULED'" class="inline-block" title="定时发布">
                <Icon name="ph:clock" class="text-blue-400" />
              </span>
              <span v-else class="text-white/40 font-mono">
                {{ chapter.order }}
              </span>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="font-medium truncate">{{ chapter.title }}</p>
                <span :class="statusBadgeClasses[chapter.status]">
                  {{ chapterStatusLabels[chapter.status] }}
                </span>
                <span v-if="chapter.status === 'SCHEDULED' && chapter.scheduledAt" class="text-xs text-blue-400">
                  {{ formatDate(chapter.scheduledAt) }}
                </span>
              </div>
              <div class="flex items-center gap-4 mt-1 text-sm text-white/50">
                <span>{{ chapter.wordCount }} 字</span>
                <span v-if="chapter.status === 'PUBLISHED'" class="flex items-center gap-1">
                  <Icon name="ph:eye" class="w-3 h-3" />
                  {{ chapter.viewCount || 0 }}
                </span>
                <span v-if="chapter.status === 'PUBLISHED'" class="flex items-center gap-1">
                  <Icon name="ph:chat-circle" class="w-3 h-3" />
                  {{ chapter._count?.comments || 0 }}
                </span>
                <span v-if="chapter.publishedAt" class="text-xs">
                  发布于 {{ formatDate(chapter.publishedAt) }}
                </span>
                <span v-else-if="chapter.createdAt" class="text-xs">
                  创建于 {{ formatDate(chapter.createdAt) }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
            <button
              v-if="chapter.status === 'DRAFT'"
              @click="quickPublish(chapter)"
              class="p-2 hover:bg-green-500/20 text-green-400 rounded-lg transition"
              title="立即发布"
            >
              <Icon name="ph:rocket" />
            </button>
            <button
              @click="editChapter(chapter)"
              class="p-2 hover:bg-white/10 rounded-lg transition"
              title="编辑"
            >
              <Icon name="ph:pencil" />
            </button>
            <button
              @click="deleteChapter(chapter)"
              class="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition"
              title="删除"
            >
              <Icon name="ph:trash" />
            </button>
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
        <div v-if="showAddModal || editTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div class="card p-6 w-full max-w-4xl my-8">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-xl font-bold">
                {{ editTarget ? '编辑章节' : '添加章节' }}
              </h3>
              <button
                @click="closeModal"
                class="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <Icon name="ph:x" />
              </button>
            </div>

            <form @submit.prevent="handleSubmit" class="space-y-5">
              <FormInput
                v-model="chapterForm.title"
                label="章节标题"
                placeholder="第一章：xxx"
                required
              />

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="block text-sm font-medium text-white/70">发布方式</label>
                  <select v-model="chapterForm.status" class="input-field">
                    <option value="PUBLISHED">立即发布</option>
                    <option value="DRAFT">保存为草稿</option>
                    <option value="SCHEDULED">定时发布</option>
                  </select>
                </div>

                <div v-if="chapterForm.status === 'SCHEDULED'" class="space-y-2">
                  <label class="block text-sm font-medium text-white/70">发布时间</label>
                  <input
                    v-model="chapterForm.scheduledAt"
                    type="datetime-local"
                    class="input-field"
                    :min="nowMin"
                  />
                </div>
              </div>

              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="block text-sm font-medium text-white/70">
                    章节内容 <span class="text-neuro-primary">*</span>
                  </label>
                  <span class="text-sm text-white/50">
                    字数：{{ wordCount }} / 约 {{ Math.ceil(wordCount / 300) }} 分钟阅读
                  </span>
                </div>
                <textarea
                  v-model="chapterForm.content"
                  rows="18"
                  class="input-field font-mono text-sm leading-relaxed"
                  placeholder="在这里输入章节内容...&#10;&#10;段落之间用空行分隔"
                />
              </div>

              <div v-if="chapterForm.status === 'DRAFT'" class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div class="flex items-start gap-2">
                  <Icon name="ph:info" class="text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p class="text-sm text-yellow-300/80">
                    草稿不会公开显示，您可以随时回来继续编辑。
                  </p>
                </div>
              </div>

              <div v-if="chapterForm.status === 'SCHEDULED'" class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div class="flex items-start gap-2">
                  <Icon name="ph:clock" class="text-blue-400 mt-0.5 flex-shrink-0" />
                  <p class="text-sm text-blue-300/80">
                    章节将在 <span class="font-semibold">{{ chapterForm.scheduledAt || '指定时间' }}</span> 自动发布。
                  </p>
                </div>
              </div>

              <div class="flex justify-end gap-3 pt-4">
                <Button @click="closeModal" type="button" variant="secondary">取消</Button>
                <Button
                  v-if="chapterForm.status === 'DRAFT'"
                  type="button"
                  :loading="submitLoading"
                  variant="secondary"
                  @click="saveAsDraft"
                >
                  保存草稿
                </Button>
                <Button type="submit" :loading="submitLoading" variant="primary">
                  {{ editTarget ? '保存修改' : (chapterForm.status === 'DRAFT' ? '保存草稿' : chapterForm.status === 'SCHEDULED' ? '确认定时' : '发布章节') }}
                </Button>
              </div>
            </form>
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
              确定要删除章节「{{ deleteTarget.title }}」吗？此操作不可撤销。
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
  layout: 'author',
  middleware: 'author'
})

const route = useRoute()
const toast = useToast()

const novelId = computed(() => Number(route.params.id))

const loading = ref(false)
const showAddModal = ref(false)
const editTarget = ref<any>(null)
const deleteTarget = ref<any>(null)
const submitLoading = ref(false)
const deleteLoading = ref(false)
const activeStatus = ref('')

const nowMin = computed(() => {
  const d = new Date()
  d.setMinutes(d.getMinutes() + 5)
  return d.toISOString().slice(0, 16)
})

const statusOptions = [
  { label: '全部', value: '', icon: 'ph:squares-four' },
  { label: '已发布', value: 'PUBLISHED', icon: 'ph:check-circle' },
  { label: '草稿箱', value: 'DRAFT', icon: 'ph:pencil-line' },
  { label: '定时发布', value: 'SCHEDULED', icon: 'ph:clock-countdown' }
]

const chapterStatusLabels: Record<string, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  SCHEDULED: '定时'
}

const statusBadgeClasses: Record<string, string> = {
  DRAFT: 'px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400',
  PUBLISHED: 'px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400',
  SCHEDULED: 'px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400'
}

const chapterForm = reactive({
  title: '',
  content: '',
  status: 'PUBLISHED' as 'PUBLISHED' | 'DRAFT' | 'SCHEDULED',
  scheduledAt: ''
})

const wordCount = computed(() => chapterForm.content.replace(/\s/g, '').length)

const { data: novelData } = await useFetch(() => `/api/author/novels/${novelId.value}`)
const novel = computed(() => novelData.value?.novel)

const { data: chaptersData, refresh } = await useFetch(
  () => `/api/author/novels/${novelId.value}/chapters`,
  { query: computed(() => activeStatus.value ? { status: activeStatus.value } : {}) }
)
const chapters = computed(() => chaptersData.value?.chapters || [])

const statusCounts = computed(() => {
  const all = chapters.value || []
  return {
    '': all.length,
    PUBLISHED: all.filter(c => c.status === 'PUBLISHED').length,
    DRAFT: all.filter(c => c.status === 'DRAFT').length,
    SCHEDULED: all.filter(c => c.status === 'SCHEDULED').length
  }
})

const filteredChapters = computed(() => {
  if (!activeStatus.value) return chapters.value
  return chapters.value.filter(c => c.status === activeStatus.value)
})

const formatDate = (d: any) => {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const openAddModal = () => {
  chapterForm.title = ''
  chapterForm.content = ''
  chapterForm.status = 'PUBLISHED'
  chapterForm.scheduledAt = ''
  editTarget.value = null
  showAddModal.value = true
}

const editChapter = async (chapter: any) => {
  const { data } = await useFetch(`/api/author/novels/${novelId.value}/chapters/${chapter.id}`)
  if (data.value?.chapter) {
    const c = data.value.chapter
    editTarget.value = chapter
    chapterForm.title = c.title
    chapterForm.content = c.content
    chapterForm.status = c.status || 'PUBLISHED'
    chapterForm.scheduledAt = c.scheduledAt ? new Date(c.scheduledAt).toISOString().slice(0, 16) : ''
  }
}

const closeModal = () => {
  showAddModal.value = false
  editTarget.value = null
  chapterForm.title = ''
  chapterForm.content = ''
  chapterForm.status = 'PUBLISHED'
  chapterForm.scheduledAt = ''
}

const deleteChapter = (chapter: any) => {
  deleteTarget.value = chapter
}

const quickPublish = async (chapter: any) => {
  try {
    const { data } = await useFetch(`/api/author/novels/${novelId.value}/chapters/${chapter.id}`)
    if (data.value?.chapter) {
      await $fetch(`/api/author/novels/${novelId.value}/chapters/${chapter.id}`, {
        method: 'PUT',
        body: {
          title: data.value.chapter.title,
          content: data.value.chapter.content,
          status: 'PUBLISHED'
        }
      })
      toast.success('发布成功')
      await refresh()
    }
  } catch (e: any) {
    toast.error(e.message || '发布失败')
  }
}

const validateForm = () => {
  if (!chapterForm.title.trim()) {
    toast.warning('请填写章节标题')
    return false
  }
  if (!chapterForm.content.trim() || chapterForm.content.replace(/\s/g, '').length < 10) {
    toast.warning('章节内容至少10个字符')
    return false
  }
  if (chapterForm.status === 'SCHEDULED' && !chapterForm.scheduledAt) {
    toast.warning('请选择定时发布时间')
    return false
  }
  if (chapterForm.status === 'SCHEDULED' && new Date(chapterForm.scheduledAt) <= new Date()) {
    toast.warning('发布时间必须晚于当前时间')
    return false
  }
  return true
}

const saveAsDraft = async () => {
  if (!chapterForm.title.trim() || !chapterForm.content.trim()) {
    toast.warning('请至少填写标题和内容')
    return
  }
  chapterForm.status = 'DRAFT'
  await handleSubmit(true)
}

const handleSubmit = async (forceDraft = false) => {
  if (!forceDraft && !validateForm()) return

  submitLoading.value = true
  try {
    const status = forceDraft ? 'DRAFT' : chapterForm.status
    const body: any = {
      title: chapterForm.title,
      content: chapterForm.content,
      status
    }
    if (status === 'SCHEDULED' && chapterForm.scheduledAt) {
      body.scheduledAt = new Date(chapterForm.scheduledAt).toISOString()
    }

    if (editTarget.value) {
      await $fetch(`/api/author/novels/${novelId.value}/chapters/${editTarget.value.id}`, {
        method: 'PUT',
        body
      })
      toast.success('保存成功')
    } else {
      await $fetch(`/api/author/novels/${novelId.value}/chapters`, {
        method: 'POST',
        body
      })
      toast.success(
        status === 'PUBLISHED' ? '发布成功' :
        status === 'SCHEDULED' ? '已设置定时发布' : '草稿已保存'
      )
    }
    closeModal()
    await refresh()
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await $fetch(`/api/author/novels/${novelId.value}/chapters/${deleteTarget.value.id}`, {
      method: 'DELETE'
    })
    toast.success('删除成功')
    deleteTarget.value = null
    await refresh()
  } catch (e: any) {
    toast.error(e.message || '删除失败')
  } finally {
    deleteLoading.value = false
  }
}

useHead({
  title: computed(() => novel.value ? `章节管理 - ${novel.value.title}` : '章节管理')
})
</script>
