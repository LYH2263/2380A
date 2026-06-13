<template>
  <div>
    <div class="flex items-center gap-4 mb-8">
      <NuxtLink to="/author/novels" class="p-2 hover:bg-white/10 rounded-lg transition">
        <Icon name="ph:arrow-left" />
      </NuxtLink>
      <h1 class="text-3xl font-bold">编辑作品</h1>
    </div>

    <div v-if="novel" class="card p-6 max-w-3xl">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <FormInput
          v-model="form.title"
          label="小说标题"
          placeholder="输入小说标题（最多100字）"
          :error="errors.title"
          required
        />

        <FormTextarea
          v-model="form.description"
          label="小说简介"
          placeholder="输入小说简介...（至少10个字符）"
          :rows="5"
          :error="errors.description"
          required
        />

        <FormInput
          v-model="form.cover"
          label="封面图片 URL"
          placeholder="https://..."
          :error="errors.cover"
        />

        <div v-if="form.cover" class="flex items-center gap-4">
          <span class="text-sm text-white/60 w-24">封面预览：</span>
          <img
            :src="form.cover"
            alt="封面预览"
            class="w-24 h-32 object-cover rounded border border-white/10"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-white/70">连载状态</label>
          <select v-model="form.status" class="input-field">
            <option value="ONGOING">连载中</option>
            <option value="COMPLETED">已完结</option>
            <option value="HIATUS">暂停更新</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-white/70">标签（用逗号分隔，最多10个）</label>
          <input
            v-model="tagsInput"
            type="text"
            class="input-field"
            placeholder="日常, 温馨, 搞笑..."
          />
          <div v-if="tags.length" class="flex flex-wrap gap-2 mt-2">
            <span
              v-for="(tag, idx) in tags"
              :key="idx"
              class="px-3 py-1 bg-neuro-primary/20 text-neuro-primary rounded-full text-sm flex items-center gap-1"
            >
              #{{ tag }}
              <button
                @click="removeTag(idx)"
                type="button"
                class="hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center"
              >
                ×
              </button>
            </span>
          </div>
        </div>

        <div class="flex justify-end gap-4 pt-4">
          <NuxtLink to="/author/novels" class="btn-secondary">取消</NuxtLink>
          <Button type="submit" :loading="loading" variant="primary">保存修改</Button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'author',
  middleware: 'author'
})

const route = useRoute()
const router = useRouter()
const toast = useToast()

const novelId = computed(() => Number(route.params.id))

const form = reactive({
  title: '',
  description: '',
  cover: '',
  status: 'ONGOING'
})

const tagsInput = ref('')

const tags = computed(() => {
  return tagsInput.value
    .split(/[,，]/)
    .map(t => t.trim())
    .filter(t => t.length > 0)
    .slice(0, 10)
})

const removeTag = (idx: number) => {
  const arr = tags.value
  arr.splice(idx, 1)
  tagsInput.value = arr.join(', ')
}

const errors = reactive({
  title: '',
  description: '',
  cover: ''
})

const loading = ref(false)

const { data: novelData, refresh } = await useFetch(() => `/api/author/novels/${novelId.value}`)
const novel = computed(() => novelData.value?.novel)

watch(novel, (n) => {
  if (n) {
    form.title = n.title
    form.description = n.description
    form.cover = n.cover || ''
    form.status = n.status
    tagsInput.value = (n.tags || []).join(', ')
  }
}, { immediate: true })

const validate = () => {
  errors.title = ''
  errors.description = ''
  errors.cover = ''

  if (!form.title.trim()) {
    errors.title = '请输入标题'
    return false
  }
  if (form.title.length > 100) {
    errors.title = '标题最多100字'
    return false
  }
  if (!form.description.trim() || form.description.length < 10) {
    errors.description = '简介至少10个字符'
    return false
  }
  if (form.cover && !/^https?:\/\//.test(form.cover)) {
    errors.cover = '请输入有效的URL'
    return false
  }
  return true
}

const handleSubmit = async () => {
  if (!validate()) return

  loading.value = true
  try {
    await $fetch(`/api/author/novels/${novelId.value}`, {
      method: 'PUT',
      body: {
        ...form,
        tags: tags.value
      }
    })

    toast.success('保存成功')
    router.push('/author/novels')
  } catch (e: any) {
    toast.error(e.message || '保存失败')
  } finally {
    loading.value = false
  }
}

useHead({
  title: computed(() => novel.value ? `编辑 - ${novel.value.title}` : '编辑作品')
})
</script>
