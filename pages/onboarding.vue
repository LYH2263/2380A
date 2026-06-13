<template>
  <div class="min-h-screen py-16">
    <div class="container mx-auto px-4 max-w-4xl">
      <div v-if="loading" class="flex flex-col items-center justify-center py-32">
        <div class="w-16 h-16 border-4 border-neuro-primary border-t-transparent rounded-full animate-spin" />
        <p class="mt-6 text-white/60">正在加载...</p>
      </div>

      <div v-else class="space-y-10">
        <div class="text-center space-y-4">
          <div class="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-neuro-primary to-neuro-secondary flex items-center justify-center shadow-lg shadow-neuro-primary/30">
            <Icon name="ph:sparkle-fill" class="text-4xl text-white" />
          </div>
          <h1 class="text-3xl md:text-4xl font-bold">
            欢迎来到 Neurosama 粉丝小说站
          </h1>
          <p class="text-lg text-white/60 max-w-xl mx-auto">
            选择你感兴趣的标签，我们将为你推荐更符合口味的作品
          </p>
        </div>

        <div class="card p-6 md:p-8">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold flex items-center gap-2">
              <Icon name="ph:tag-fill" class="text-neuro-accent" />
              选择感兴趣的标签
            </h2>
            <span class="text-sm text-white/50">
              已选 <span :class="selectedTags.length > 0 ? 'text-neuro-primary font-medium' : ''">{{ selectedTags.length }}</span> / 最多 10 个
            </span>
          </div>

          <div v-if="searchQuery || availableTags.length === 0" class="mb-4">
            <div class="relative">
              <Icon
                name="ph:magnifying-glass"
                class="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索标签..."
                class="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-neuro-primary/50 transition"
              />
            </div>
          </div>

          <div class="flex flex-wrap gap-3 min-h-[200px]">
            <button
              v-for="tag in filteredTags"
              :key="tag"
              @click="toggleTag(tag)"
              :disabled="!selectedTags.includes(tag) && selectedTags.length >= 10"
              :class="[
                'px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border',
                selectedTags.includes(tag)
                  ? 'bg-gradient-to-r from-neuro-primary to-neuro-secondary text-white border-transparent shadow-lg shadow-neuro-primary/20 scale-105'
                  : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20',
                !selectedTags.includes(tag) && selectedTags.length >= 10 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              ]"
            >
              <span class="mr-1">#</span>{{ tag }}
              <span
                v-if="tagCounts[tag]"
                :class="selectedTags.includes(tag) ? 'text-white/70' : 'text-white/40'"
                class="ml-1.5 text-xs"
              >
                ({{ formatCount(tagCounts[tag]) }})
              </span>
            </button>

            <div v-if="filteredTags.length === 0" class="w-full text-center py-12 text-white/40">
              <Icon name="ph:tag" class="text-4xl mb-3 mx-auto opacity-50" />
              <p>没有找到匹配的标签</p>
            </div>
          </div>

          <div v-if="selectedTags.length > 0" class="mt-6 pt-6 border-t border-white/10">
            <p class="text-sm text-white/50 mb-3">已选择的标签（点击可取消）：</p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tag in selectedTags"
                :key="tag"
                @click="toggleTag(tag)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neuro-primary/20 text-neuro-primary rounded-lg text-sm cursor-pointer hover:bg-red-500/20 hover:text-red-400 transition"
              >
                #{{ tag }}
                <Icon name="ph:x" class="text-xs" />
              </span>
            </div>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row justify-center gap-4">
          <button
            @click="handleSkip"
            class="px-8 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition font-medium"
          >
            跳过，随便看看
          </button>
          <button
            @click="handleSubmit"
            :disabled="submitting"
            :class="[
              'px-10 py-3 rounded-xl font-medium transition-all duration-200',
              selectedTags.length > 0
                ? 'bg-gradient-to-r from-neuro-primary to-neuro-secondary text-white shadow-lg shadow-neuro-primary/30 hover:shadow-xl hover:shadow-neuro-primary/40 hover:scale-105'
                : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
            ]"
          >
            <span v-if="submitting" class="inline-flex items-center gap-2">
              <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              保存中...
            </span>
            <span v-else>
              {{ selectedTags.length > 0 ? '开始探索' : '请至少选择 1 个标签' }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { user, fetchUser } = useAuth()
const toast = useToast()
const router = useRouter()

const loading = ref(true)
const submitting = ref(false)
const searchQuery = ref('')
const selectedTags = ref<string[]>([])
const availableTags = ref<{ tag: string; count: number }[]>([])
const tagCounts = ref<Record<string, number>>({})

const filteredTags = computed(() => {
  const allTags = availableTags.value.map(t => t.tag)
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return allTags
  return allTags.filter(t => t.toLowerCase().includes(q))
})

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

function toggleTag(tag: string) {
  const idx = selectedTags.value.indexOf(tag)
  if (idx >= 0) {
    selectedTags.value.splice(idx, 1)
  } else if (selectedTags.value.length < 10) {
    selectedTags.value.push(tag)
  }
}

async function handleSubmit() {
  if (selectedTags.value.length === 0 || submitting.value) return

  submitting.value = true
  try {
    await $fetch('/api/user/tags', {
      method: 'POST',
      body: {
        tags: selectedTags.value,
        markCompleted: true
      }
    })
    toast.success('已保存偏好，正在为你准备推荐...')
    await fetchUser()
    setTimeout(() => {
      router.push('/')
    }, 500)
  } catch (e: any) {
    toast.error(e.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

async function handleSkip() {
  try {
    await $fetch('/api/user/tags', {
      method: 'POST',
      body: {
        tags: [],
        markCompleted: true
      }
    })
    await fetchUser()
    router.push('/')
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  }
}

onMounted(async () => {
  try {
    const res: any = await $fetch('/api/user/tags')
    availableTags.value = res.available || []
    selectedTags.value = (res.selected || []).map((s: any) => s.tag)
    for (const t of availableTags.value) {
      tagCounts.value[t.tag] = t.count
    }
  } catch (e) {
    toast.error('加载标签失败')
  } finally {
    loading.value = false
  }
})

useHead({
  title: '选择你的兴趣 - Neurosama 粉丝小说站'
})
</script>
