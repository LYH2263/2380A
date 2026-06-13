<template>
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div class="glass rounded-2xl p-6 w-full max-w-md">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold">
          {{ editingList ? '编辑书单' : '创建书单' }}
        </h2>
        <button 
          @click="$emit('close')"
          class="p-2 rounded-lg hover:bg-white/10 transition"
        >
          <Icon name="ph:x" class="w-5 h-5" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">书单名称</label>
            <input 
              v-model="form.name"
              type="text"
              class="input-field"
              placeholder="如：在追连载"
              maxlength="50"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">描述（可选）</label>
            <textarea 
              v-model="form.description"
              class="input-field min-h-[80px] resize-none"
              placeholder="简单描述这个书单..."
              maxlength="200"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">标签颜色</label>
            <div class="flex gap-2 flex-wrap">
              <button
                v-for="color in colorOptions"
                :key="color.value"
                type="button"
                :class="[
                  'w-8 h-8 rounded-full transition-all',
                  form.color === color.value 
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110' 
                    : 'hover:scale-105'
                ]"
                :style="{ backgroundColor: color.value }"
                @click="form.color = color.value"
              />
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            type="button"
            class="btn-secondary flex-1"
            @click="$emit('close')"
          >
            取消
          </button>
          <button
            type="submit"
            class="btn-primary flex-1"
            :disabled="loading || !form.name.trim()"
          >
            {{ loading ? '保存中...' : (editingList ? '保存' : '创建') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'

interface BookList {
  id: number
  name: string
  description?: string
  color?: string
}

const props = defineProps<{
  editingList?: BookList | null
}>()

const emit = defineEmits<{
  close: []
  submit: [data: { name: string; description?: string; color?: string }]
}>()

const toast = useToast()

const colorOptions = [
  { value: '#ef4444', name: '红色' },
  { value: '#f97316', name: '橙色' },
  { value: '#eab308', name: '黄色' },
  { value: '#22c55e', name: '绿色' },
  { value: '#06b6d4', name: '青色' },
  { value: '#3b82f6', name: '蓝色' },
  { value: '#8b5cf6', name: '紫色' },
  { value: '#ec4899', name: '粉色' },
]

const form = ref({
  name: props.editingList?.name || '',
  description: props.editingList?.description || '',
  color: props.editingList?.color || colorOptions[0].value
})

const loading = ref(false)

const schema = z.object({
  name: z.string().min(1, '请输入书单名称').max(50),
  description: z.string().max(200).optional(),
  color: z.string()
})

const handleSubmit = async () => {
  const validated = schema.safeParse(form.value)
  if (!validated.success) {
    toast.error(validated.error.issues[0].message)
    return
  }

  loading.value = true
  try {
    emit('submit', validated.data)
  } finally {
    loading.value = false
  }
}
</script>
