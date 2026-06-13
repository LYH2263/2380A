<template>
  <div>
    <h1 class="text-3xl font-bold mb-8">小说备份与恢复</h1>

    <div class="grid lg:grid-cols-3 gap-8">
      <!-- 左侧：操作区域 -->
      <div class="lg:col-span-1 space-y-6">
        <!-- 创建备份 -->
        <section class="card p-6">
          <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
            <Icon name="ph:archive-box" class="text-2xl text-purple-400" />
            创建备份
          </h2>

          <p class="text-white/60 text-sm mb-4">
            将指定小说（含所有章节、评论）导出为完整备份包，可用于恢复。
          </p>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">选择小说</label>
              <input
                v-model="novelSearch"
                type="text"
                placeholder="搜索小说..."
                class="input-field text-sm py-2 mb-2"
              />
              <div v-if="novelSearch && filteredNovels.length > 0" class="max-h-48 overflow-y-auto border border-white/10 rounded-lg">
                <div
                  v-for="n in filteredNovels.slice(0, 10)"
                  :key="n.id"
                  @click="selectNovel(n)"
                  class="p-2 hover:bg-white/5 cursor-pointer flex items-center gap-2 border-b border-white/5 last:border-b-0"
                >
                  <div class="w-8 h-10 bg-white/10 rounded flex-shrink-0 overflow-hidden">
                    <img v-if="n.cover" :src="n.cover" class="w-full h-full object-cover" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-medium truncate">{{ n.title }}</p>
                    <p class="text-xs text-white/50">{{ n.author?.username || '未知作者' }} · {{ n.chapterCount || 0 }} 章</p>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="selectedNovel" class="p-3 bg-white/5 rounded-lg flex items-center gap-3">
              <div class="w-10 h-12 bg-white/10 rounded flex-shrink-0 overflow-hidden">
                <img v-if="selectedNovel.cover" :src="selectedNovel.cover" class="w-full h-full object-cover" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-medium truncate">{{ selectedNovel.title }}</p>
                <p class="text-xs text-white/50">{{ selectedNovel.chapterCount || 0 }} 章 · {{ selectedNovel._count?.chapters || 0 }} 章节</p>
              </div>
              <button @click="selectedNovel = null" class="text-white/50 hover:text-white">
                <Icon name="ph:x" class="w-5 h-5" />
              </button>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">备注（可选）</label>
              <input
                v-model="backupNote"
                type="text"
                placeholder="例如：正式更新前备份"
                class="input-field text-sm py-2"
              />
            </div>

            <button
              @click="handleCreateBackup"
              :disabled="!selectedNovel || creatingBackup"
              class="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="creatingBackup">
                <Icon name="ph:spinner" class="animate-spin inline mr-2" />
                正在创建备份任务...
              </span>
              <span v-else>
                <Icon name="ph:archive-box" class="inline mr-2" />
                创建备份
              </span>
            </button>

            <div v-if="backupResult" class="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p class="text-sm text-green-400">
                ✅ 备份任务已创建，任务 ID: #{{ backupResult.taskId }}
                <NuxtLink to="/admin/tasks" class="underline">查看进度</NuxtLink>
              </p>
            </div>
          </div>
        </section>

        <!-- 恢复备份 -->
        <section class="card p-6">
          <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
            <Icon name="ph:arrow-clockwise" class="text-2xl text-orange-400" />
            恢复备份
          </h2>

          <p class="text-white/60 text-sm mb-4">
            上传之前导出的 .zip 备份包，恢复为一部新的小说。
          </p>

          <div
            class="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-white/40 transition-colors"
            :class="{ 'border-neuro-primary bg-neuro-primary/5': restoreDragOver }"
            @dragover.prevent="restoreDragOver = true"
            @dragleave="restoreDragOver = false"
            @drop.prevent="handleRestoreDrop"
          >
            <input
              ref="restoreInput"
              type="file"
              accept=".zip"
              class="hidden"
              @change="handleRestoreFile"
            />
            <Icon name="ph:cloud-arrow-up" class="w-12 h-12 mx-auto mb-3 text-white/40" />
            <p class="mb-1">
              <button
                @click="restoreInput?.click()"
                class="text-neuro-primary hover:underline font-medium text-sm"
              >
                点击选择文件
              </button>
              或拖拽
            </p>
            <p class="text-xs text-white/40">仅支持 .zip 备份文件</p>
          </div>

          <div v-if="restoreFile" class="mt-3 p-3 bg-white/5 rounded-lg flex items-center justify-between">
            <div class="flex items-center gap-2 min-w-0">
              <Icon name="ph:file-zip" class="w-6 h-6 text-orange-400 flex-shrink-0" />
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ restoreFile.name }}</p>
                <p class="text-xs text-white/50">{{ formatSize(restoreFile.size) }}</p>
              </div>
            </div>
            <button @click="restoreFile = null" class="text-white/50 hover:text-white p-1">
              <Icon name="ph:x" class="w-4 h-4" />
            </button>
          </div>

          <button
            v-if="restoreFile"
            @click="handleRestore"
            :disabled="restoring"
            class="w-full mt-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg py-2.5 transition-colors"
          >
            <span v-if="restoring">
              <Icon name="ph:spinner" class="animate-spin inline mr-2" />
              正在创建恢复任务...
            </span>
            <span v-else>
              <Icon name="ph:arrow-clockwise" class="inline mr-2" />
              开始恢复
            </span>
          </button>

          <div v-if="restoreResult" class="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p class="text-sm text-green-400">
              ✅ 恢复任务已创建，任务 ID: #{{ restoreResult.taskId }}
              <NuxtLink to="/admin/tasks" class="underline">查看进度</NuxtLink>
            </p>
          </div>

          <div class="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p class="text-xs text-yellow-400">
              ⚠️ 恢复操作会创建一部新的小说，不会覆盖现有数据。评论的作者如果不存在会自动创建占位用户。
            </p>
          </div>
        </section>
      </div>

      <!-- 右侧：备份列表 -->
      <div class="lg:col-span-2">
        <section class="card p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold flex items-center gap-2">
              <Icon name="ph:files" class="text-2xl" />
              备份历史
            </h2>
            <button @click="loadBackups" class="btn-secondary text-sm py-2">
              <Icon name="ph:arrow-clockwise" class="mr-2" />
              刷新
            </button>
          </div>

          <div v-if="backupsLoading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-10 w-10 border-4 border-white/20 border-t-neuro-primary" />
          </div>

          <div v-else-if="backups.length === 0" class="text-center py-16 text-white/50">
            <Icon name="ph:inbox" class="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>暂无备份记录</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="b in backups"
              :key="b.id"
              class="p-4 border border-white/10 rounded-xl hover:border-white/20 transition-colors"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-start gap-3 min-w-0 flex-1">
                  <div class="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon name="ph:file-zip" class="w-5 h-5 text-purple-400" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 class="font-medium truncate">{{ b.novelTitle }}</h3>
                      <span class="text-xs text-white/50">#{{ b.novelId }}</span>
                    </div>
                    <div class="text-xs text-white/50 flex flex-wrap gap-x-4 gap-y-1">
                      <span>版本: v{{ b.version }}</span>
                      <span>{{ b.chapterCount }} 章</span>
                      <span>{{ b.commentCount }} 条评论</span>
                      <span>{{ formatSize(b.fileSize) }}</span>
                    </div>
                    <p v-if="b.note" class="text-xs text-white/70 mt-2 italic">📝 {{ b.note }}</p>
                    <div class="text-xs text-white/40 mt-1 flex flex-wrap gap-x-4">
                      <span>{{ b.admin?.username ? `管理员: ${b.admin.username}` : '' }}</span>
                      <span>创建于: {{ formatDate(b.createdAt) }}</span>
                    </div>
                  </div>
                </div>

                <div class="flex gap-2 flex-shrink-0">
                  <a
                    :href="`/api/admin/backups/${b.id}/download`"
                    class="px-3 py-1.5 text-xs bg-neuro-primary/20 text-neuro-primary rounded-lg hover:bg-neuro-primary/30 transition-colors"
                  >
                    <Icon name="ph:download-simple" class="inline mr-1" />
                    下载
                  </a>
                  <button
                    @click="deleteBackup(b)"
                    class="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    <Icon name="ph:trash" class="inline mr-1" />
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

const novelSearch = ref('')
const backupNote = ref('')
const selectedNovel = ref<any>(null)
const allNovels = ref<any[]>([])
const filteredNovels = computed(() => {
  if (!novelSearch.value) return []
  const q = novelSearch.value.toLowerCase()
  return allNovels.value.filter(n =>
    n.title.toLowerCase().includes(q) ||
    n.author?.username?.toLowerCase().includes(q)
  )
})

const creatingBackup = ref(false)
const backupResult = ref<any>(null)

const restoreInput = ref<HTMLInputElement | null>(null)
const restoreDragOver = ref(false)
const restoreFile = ref<File | null>(null)
const restoring = ref(false)
const restoreResult = ref<any>(null)

const backupsLoading = ref(false)
const backups = ref<any[]>([])

function selectNovel(novel: any) {
  selectedNovel.value = novel
  novelSearch.value = novel.title
}

function formatSize(bytes: number): string {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

async function loadAllNovels() {
  try {
    const { data } = await useFetch('/api/novels/index', {
      query: { pageSize: 1000 }
    })
    allNovels.value = data.value?.novels || []
  } catch (e) {
    allNovels.value = []
  }
}

async function loadBackups() {
  backupsLoading.value = true
  try {
    const { data } = await useFetch('/api/admin/backups/index', {
      query: { pageSize: 100 }
    })
    backups.value = data.value?.backups || []
  } finally {
    backupsLoading.value = false
  }
}

async function handleCreateBackup() {
  if (!selectedNovel.value) return
  creatingBackup.value = true
  backupResult.value = null

  try {
    const { data, error } = await useFetch(`/api/admin/backups/novels/${selectedNovel.value.id}`, {
      method: 'POST',
      body: { note: backupNote.value || undefined }
    })

    if (error.value) {
      alert(error.value.data?.message || '创建备份失败')
      return
    }
    backupResult.value = data.value
    backupNote.value = ''
    setTimeout(loadBackups, 2000)
  } finally {
    creatingBackup.value = false
  }
}

function handleRestoreFile(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    if (file.name.toLowerCase().endsWith('.zip')) {
      restoreFile.value = file
    } else {
      alert('仅支持 .zip 备份文件')
    }
  }
}

function handleRestoreDrop(e: DragEvent) {
  restoreDragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) {
    if (file.name.toLowerCase().endsWith('.zip')) {
      restoreFile.value = file
    } else {
      alert('仅支持 .zip 备份文件')
    }
  }
}

async function handleRestore() {
  if (!restoreFile.value) return
  restoring.value = true
  restoreResult.value = null

  try {
    const formData = new FormData()
    formData.append('file', restoreFile.value)

    const { data, error } = await useFetch('/api/admin/backups/restore', {
      method: 'POST',
      body: formData
    })

    if (error.value) {
      alert(error.value.data?.message || '恢复失败')
      return
    }
    restoreResult.value = data.value
    restoreFile.value = null
  } finally {
    restoring.value = false
  }
}

async function deleteBackup(b: any) {
  if (!confirm(`确定删除备份 "${b.novelTitle}" 吗？`)) return
  const { error } = await useFetch(`/api/admin/backups/${b.id}`, { method: 'DELETE' })
  if (error.value) {
    alert(error.value.data?.message || '删除失败')
    return
  }
  await loadBackups()
}

useHead({ title: '备份管理 - 管理后台' })

onMounted(() => {
  loadAllNovels()
  loadBackups()
})
</script>
