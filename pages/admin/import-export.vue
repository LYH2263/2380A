<template>
  <div>
    <h1 class="text-3xl font-bold mb-8">数据导入与导出</h1>

    <div class="grid lg:grid-cols-2 gap-8">
      <!-- 小说批量导入 -->
      <section class="card p-6">
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <Icon name="ph:upload-simple" class="text-2xl text-green-400" />
          小说批量导入
        </h2>

        <p class="text-white/60 text-sm mb-4">
          支持 Excel (.xlsx, .xls) 和 CSV 格式批量导入小说。
          请先下载模板，按照格式填写后上传。
        </p>

        <div class="mb-4 flex gap-2">
          <a
            href="/api/admin/import/template"
            class="btn-secondary text-sm"
          >
            <Icon name="ph:file-spreadsheet" class="mr-2" />
            下载导入模板
          </a>
        </div>

        <div
          class="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-white/40 transition-colors"
          :class="{ 'border-neuro-primary bg-neuro-primary/5': dragOver }"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop.prevent="handleDrop"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx,.xls,.csv"
            class="hidden"
            @change="handleFileChange"
          />

          <Icon name="ph:cloud-arrow-up" class="w-16 h-16 mx-auto mb-4 text-white/40" />
          <p class="mb-2">
            <button
              @click="fileInput?.click()"
              class="text-neuro-primary hover:underline font-medium"
            >
              点击选择文件
            </button>
            或拖拽到此处
          </p>
          <p class="text-xs text-white/40">支持 .xlsx, .xls, .csv 格式</p>
        </div>

        <div v-if="selectedFile" class="mt-4 p-3 bg-white/5 rounded-lg flex items-center justify-between">
          <div class="flex items-center gap-3 min-w-0">
            <Icon name="ph:file-spreadsheet" class="w-8 h-8 text-green-400 flex-shrink-0" />
            <div class="min-w-0">
              <p class="text-sm font-medium truncate">{{ selectedFile.name }}</p>
              <p class="text-xs text-white/50">{{ formatFileSize(selectedFile.size) }}</p>
            </div>
          </div>
          <button
            @click="selectedFile = null"
            class="text-white/50 hover:text-white p-1"
          >
            <Icon name="ph:x" class="w-5 h-5" />
          </button>
        </div>

        <button
          v-if="selectedFile"
          @click="handleImportNovels"
          :disabled="importing"
          class="w-full mt-4 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="importing">
            <Icon name="ph:spinner" class="animate-spin inline mr-2" />
            正在创建导入任务...
          </span>
          <span v-else>
            <Icon name="ph:upload-simple" class="inline mr-2" />
            开始导入
          </span>
        </button>

        <div v-if="importResult" class="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p class="font-medium text-green-400 mb-2">✅ 导入任务已创建</p>
          <p class="text-sm text-white/70">
            任务 ID: #{{ importResult.taskId }}
             · 请前往
            <NuxtLink to="/admin/tasks" class="text-neuro-primary hover:underline">任务中心</NuxtLink>
            查看进度
          </p>
        </div>
      </section>

      <!-- 数据导出 -->
      <section class="card p-6">
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <Icon name="ph:download-simple" class="text-2xl text-blue-400" />
          数据导出
        </h2>

        <div class="space-y-4">
          <!-- 导出类型选择 -->
          <div>
            <label class="block text-sm font-medium mb-2">导出类型</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="opt in exportOptions"
                :key="opt.type"
                @click="selectedExport = opt.type"
                :class="[
                  'p-3 rounded-lg border-2 text-left transition-all',
                  selectedExport === opt.type
                    ? 'border-neuro-primary bg-neuro-primary/10'
                    : 'border-white/10 hover:border-white/20'
                ]"
              >
                <div class="text-xl mb-1">{{ opt.icon }}</div>
                <div class="text-sm font-medium">{{ opt.label }}</div>
              </button>
            </div>
          </div>

          <!-- 筛选条件 -->
          <div>
            <label class="block text-sm font-medium mb-2">筛选条件（可选）</label>
            <div class="space-y-2">
              <div>
                <label class="text-xs text-white/60">关键词</label>
                <input
                  v-model="exportFilters.keyword"
                  type="text"
                  :placeholder="keywordPlaceholder"
                  class="input-field text-sm py-2"
                />
              </div>

              <div v-if="selectedExport === 'novels'" class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-xs text-white/60">状态</label>
                  <select v-model="exportFilters.status" class="input-field text-sm py-2">
                    <option value="">全部</option>
                    <option value="ONGOING">连载中</option>
                    <option value="COMPLETED">已完结</option>
                    <option value="HIATUS">暂停</option>
                  </select>
                </div>
                <div>
                  <label class="text-xs text-white/60">是否推荐</label>
                  <select v-model="exportFilters.isFeatured" class="input-field text-sm py-2">
                    <option :value="undefined">全部</option>
                    <option :value="true">仅推荐</option>
                    <option :value="false">非推荐</option>
                  </select>
                </div>
              </div>

              <div v-if="selectedExport === 'users'">
                <label class="text-xs text-white/60">角色</label>
                <select v-model="exportFilters.role" class="input-field text-sm py-2">
                  <option value="">全部</option>
                  <option value="USER">普通用户</option>
                  <option value="ADMIN">管理员</option>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-xs text-white/60">开始日期</label>
                  <input
                    v-model="exportFilters.dateFrom"
                    type="date"
                    class="input-field text-sm py-2"
                  />
                </div>
                <div>
                  <label class="text-xs text-white/60">结束日期</label>
                  <input
                    v-model="exportFilters.dateTo"
                    type="date"
                    class="input-field text-sm py-2"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 导出字段 -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium">选择导出字段</label>
              <div class="flex gap-2 text-xs">
                <button @click="selectAllFields" class="text-neuro-primary hover:underline">全选</button>
                <button @click="clearFields" class="text-white/50 hover:text-white/70">清空</button>
              </div>
            </div>
            <div class="border border-white/10 rounded-lg p-3 max-h-48 overflow-y-auto">
              <div class="grid grid-cols-2 gap-2">
                <label
                  v-for="f in availableFields"
                  :key="f.key"
                  class="flex items-center gap-2 text-sm cursor-pointer hover:bg-white/5 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    :value="f.key"
                    v-model="selectedFields"
                    class="rounded"
                  />
                  <span>{{ f.label }}</span>
                </label>
              </div>
              <div v-if="availableFields.length === 0" class="text-center text-white/50 text-sm py-2">
                请先选择导出类型
              </div>
            </div>
          </div>

          <button
            @click="handleExport"
            :disabled="exporting"
            class="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="exporting">
              <Icon name="ph:spinner" class="animate-spin inline mr-2" />
              正在创建导出任务...
            </span>
            <span v-else>
              <Icon name="ph:download-simple" class="inline mr-2" />
              创建导出任务
            </span>
          </button>

          <div v-if="exportResult" class="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p class="font-medium text-green-400 mb-2">✅ 导出任务已创建</p>
            <p class="text-sm text-white/70">
              任务 ID: #{{ exportResult.taskId }}
               · 请前往
              <NuxtLink to="/admin/tasks" class="text-neuro-primary hover:underline">任务中心</NuxtLink>
              查看进度
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

const exportOptions = [
  { type: 'novels' as const, label: '小说列表', icon: '📊' },
  { type: 'users' as const, label: '用户列表', icon: '👥' },
  { type: 'comments' as const, label: '评论列表', icon: '💬' }
]

const selectedExport = ref<'novels' | 'users' | 'comments'>('novels')
const exportFilters = ref<{
  keyword: string
  status?: string
  role?: string
  dateFrom?: string
  dateTo?: string
  isFeatured?: boolean
}>({ keyword: '' })
const selectedFields = ref<string[]>([])
const availableFields = ref<{ key: string; label: string }[]>([])

const fileInput = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)
const selectedFile = ref<File | null>(null)
const importing = ref(false)
const importResult = ref<any>(null)
const exporting = ref(false)
const exportResult = ref<any>(null)

const keywordPlaceholder = computed(() => {
  const map = {
    novels: '搜索标题、简介...',
    users: '搜索用户名、邮箱...',
    comments: '搜索评论内容...'
  }
  return map[selectedExport.value]
})

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.[0]) {
    selectedFile.value = target.files[0]
  }
}

function handleDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) {
    const ext = file.name.toLowerCase().split('.').pop()
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
      selectedFile.value = file
    } else {
      alert('仅支持 xlsx, xls, csv 格式文件')
    }
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function loadFields() {
  const { data } = await useFetch(`/api/admin/export/${selectedExport.value}/fields`)
  availableFields.value = data.value?.fields || []
  selectedFields.value = availableFields.value.map(f => f.key)
}

function selectAllFields() {
  selectedFields.value = availableFields.value.map(f => f.key)
}

function clearFields() {
  selectedFields.value = []
}

async function handleImportNovels() {
  if (!selectedFile.value) return
  importing.value = true
  importResult.value = null

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const { data, error } = await useFetch('/api/admin/import/novels', {
      method: 'POST',
      body: formData
    })

    if (error.value) {
      alert(error.value.data?.message || '导入失败')
      return
    }

    importResult.value = data.value
    selectedFile.value = null
  } finally {
    importing.value = false
  }
}

async function handleExport() {
  if (selectedFields.value.length === 0) {
    alert('请至少选择一个导出字段')
    return
  }
  exporting.value = true
  exportResult.value = null

  try {
    const { data, error } = await useFetch(`/api/admin/export/${selectedExport.value}`, {
      method: 'POST',
      body: {
        fields: selectedFields.value,
        filters: Object.fromEntries(
          Object.entries(exportFilters.value).filter(([, v]) => v !== '' && v !== undefined && v !== null)
        )
      }
    })

    if (error.value) {
      alert(error.value.data?.message || '导出失败')
      return
    }

    exportResult.value = data.value
  } finally {
    exporting.value = false
  }
}

useHead({ title: '导入导出 - 管理后台' })

watch(selectedExport, loadFields, { immediate: true })
</script>
