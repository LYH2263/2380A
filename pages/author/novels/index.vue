<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-3xl font-bold">我的作品</h1>
      <NuxtLink to="/author/novels/new" class="btn-primary">
        <Icon name="ph:plus" class="mr-2" />
        投稿新作品
      </NuxtLink>
    </div>

    <div class="flex items-center gap-4 mb-6">
      <div class="flex items-center gap-2">
        <button
          v-for="opt in statusOptions"
          :key="opt.value"
          @click="activeStatus = opt.value"
          :class="[
            'px-4 py-2 rounded-lg text-sm transition',
            activeStatus === opt.value
              ? 'bg-white/10 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          ]"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="card overflow-hidden">
      <div v-if="!novels.length && !loading" class="p-12 text-center text-white/50">
        <Icon name="ph:book-open" class="text-4xl mb-4" />
        <p>暂无作品</p>
        <NuxtLink to="/author/novels/new" class="btn-primary mt-4 inline-flex">
          <Icon name="ph:plus" class="mr-2" />
          立即投稿
        </NuxtLink>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-white/5">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">小说</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">状态</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">章节</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">阅读量</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">收藏</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">评论</th>
              <th class="px-6 py-4 text-right text-sm font-medium text-white/70">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr
              v-for="novel in novels"
              :key="novel.id"
              class="hover:bg-white/5 transition"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <img
                    :src="novel.cover || defaultCover"
                    :alt="novel.title"
                    class="w-12 h-16 object-cover rounded"
                  />
                  <div>
                    <p class="font-medium">{{ novel.title }}</p>
                    <p class="text-sm text-white/50 line-clamp-1 max-w-xs">{{ novel.description }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span :class="[
                  'px-2 py-1 rounded text-xs font-medium',
                  statusClasses[novel.status]
                ]">
                  {{ statusLabels[novel.status] }}
                </span>
              </td>
              <td class="px-6 py-4 text-white/70">
                {{ novel._count?.chapters || 0 }} 章
              </td>
              <td class="px-6 py-4 text-white/70">
                {{ formatNumber(novel.viewCount) }}
              </td>
              <td class="px-6 py-4 text-white/70">
                {{ novel._count?.favorites || 0 }}
              </td>
              <td class="px-6 py-4 text-white/70">
                {{ novel.commentCount || 0 }}
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <NuxtLink
                    :to="`/novels/${novel.id}`"
                    class="p-2 hover:bg-white/10 rounded-lg transition"
                    title="查看"
                    target="_blank"
                  >
                    <Icon name="ph:eye" />
                  </NuxtLink>
                  <NuxtLink
                    :to="`/author/novels/${novel.id}/chapters`"
                    class="p-2 hover:bg-white/10 rounded-lg transition"
                    title="章节管理"
                  >
                    <Icon name="ph:list" />
                  </NuxtLink>
                  <NuxtLink
                    :to="`/author/novels/${novel.id}/edit`"
                    class="p-2 hover:bg-white/10 rounded-lg transition"
                    title="编辑"
                  >
                    <Icon name="ph:pencil" />
                  </NuxtLink>
                  <button
                    @click="handleDelete(novel)"
                    class="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                    title="删除"
                  >
                    <Icon name="ph:trash" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="pagination && pagination.totalPages > 1" class="p-4 border-t border-white/10 flex justify-center gap-2">
        <button
          @click="page--"
          :disabled="page <= 1 || loading"
          class="btn-secondary px-3 py-1 disabled:opacity-50"
        >
          上一页
        </button>
        <span class="px-4 py-1 text-white/70">
          {{ page }} / {{ pagination.totalPages }}
        </span>
        <button
          @click="page++"
          :disabled="page >= pagination.totalPages || loading"
          class="btn-secondary px-3 py-1 disabled:opacity-50"
        >
          下一页
        </button>
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
        <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div class="card p-6 max-w-md w-full">
            <h3 class="text-xl font-bold mb-4">确认删除</h3>
            <p class="text-white/70 mb-6">
              确定要删除小说「{{ deleteTarget.title }}」吗？此操作不可撤销，所有章节和评论也将被删除。
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

const router = useRouter()
const toast = useToast()

const page = ref(1)
const activeStatus = ref('')
const loading = ref(false)
const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)

const statusOptions = [
  { label: '全部', value: '' },
  { label: '连载中', value: 'ONGOING' },
  { label: '已完结', value: 'COMPLETED' },
  { label: '暂停更新', value: 'HIATUS' }
]

const statusLabels: Record<string, string> = {
  ONGOING: '连载中',
  COMPLETED: '已完结',
  HIATUS: '暂停更新'
}

const statusClasses: Record<string, string> = {
  ONGOING: 'bg-green-500/20 text-green-400',
  COMPLETED: 'bg-blue-500/20 text-blue-400',
  HIATUS: 'bg-yellow-500/20 text-yellow-400'
}

const defaultCover = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200'

const formatNumber = (n: number) => {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

const { data, refresh } = await useFetch('/api/author/novels', {
  query: computed(() => ({
    page: page.value,
    limit: 10,
    ...(activeStatus.value ? { status: activeStatus.value } : {})
  })),
  watch: [page, activeStatus],
  onRequest: () => { loading.value = true },
  onResponse: () => { loading.value = false }
})

const novels = computed(() => data.value?.novels || [])
const pagination = computed(() => data.value?.pagination)

const handleDelete = (novel: any) => {
  deleteTarget.value = novel
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await $fetch(`/api/author/novels/${deleteTarget.value.id}`, { method: 'DELETE' })
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
  title: '我的作品 - 作者中心'
})
</script>
