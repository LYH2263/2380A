<template>
  <Transition
    enter-active-class="transition duration-300"
    enter-from-class="opacity-0 -translate-x-full"
    enter-to-class="opacity-100 translate-x-0"
    leave-active-class="transition duration-200"
    leave-from-class="opacity-100 translate-x-0"
    leave-to-class="opacity-0 -translate-x-full"
  >
    <div
      v-if="visible && sections.length > 0"
      class="fixed inset-0 z-50"
      @click.self="$emit('close')"
    >
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('close')" />
      
      <div
        class="relative w-72 max-w-full h-full overflow-y-auto glass border-r border-white/10 p-6"
        @click.stop
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold">章节内目录</h3>
          <button @click="$emit('close')" class="p-2 rounded-lg hover:bg-white/10 transition">
            <Icon name="ph:x" />
          </button>
        </div>

        <div class="space-y-1">
          <button
            v-for="(section, index) in sections"
            :key="index"
            @click="navigateTo(section, index)"
            class="w-full text-left px-3 py-2 rounded-lg text-sm transition hover:bg-white/10 truncate"
            :class="{ 'bg-white/10 text-neuro-primary': activeIndex === index }"
          >
            <span class="mr-2 text-white/40">{{ index + 1 }}.</span>
            {{ section.title }}
          </button>
        </div>

        <div v-if="sections.length === 0" class="text-center py-8 text-white/50 text-sm">
          暂无章节内分段
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { Ref } from 'vue'

interface Section {
  title: string
  paragraphIndex: number
}

const props = defineProps<{
  visible: boolean
  paragraphs: string[]
  paragraphRefs?: Ref<HTMLElement[]>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'navigate', paragraphIndex: number): void
}>()

const activeIndex = ref(0)

const sections = computed<Section[]>(() => {
  const result: Section[] = []
  
  props.paragraphs.forEach((para, index) => {
    const trimmed = para.trim()
    
    if (!trimmed) return
    
    const isHeading = /^(第[一二三四五六七八九十百千\d]+[节章部分]|[一二三四五六七八九十]+、|\d+\.|[【\[]\s*.*\s*[】\]])/.test(trimmed)
    const isShortLine = trimmed.length <= 15 && trimmed.length >= 2
    const hasNoPunctuation = !/[。，！？；：,.!?;:]/.test(trimmed)
    const isDivider = /^[-=_·•\*\s]+$/.test(trimmed) && trimmed.length >= 3
    
    if ((isHeading || (isShortLine && hasNoPunctuation) || isDivider) && index > 0) {
      const title = trimmed.length > 20 ? trimmed.substring(0, 20) + '...' : trimmed
      result.push({
        title,
        paragraphIndex: index
      })
    }
  })
  
  return result
})

const navigateTo = (section: Section, index: number) => {
  activeIndex.value = index
  
  if (props.paragraphRefs?.value?.[section.paragraphIndex]) {
    const el = props.paragraphRefs.value[section.paragraphIndex]
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } else {
    emit('navigate', section.paragraphIndex)
  }
  
  emit('close')
}

const updateActiveSection = () => {
  if (!props.paragraphRefs?.value || sections.value.length === 0) return
  
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const windowHeight = window.innerHeight
  
  let currentIndex = 0
  for (let i = sections.value.length - 1; i >= 0; i--) {
    const paraIdx = sections.value[i].paragraphIndex
    const el = props.paragraphRefs.value[paraIdx]
    if (el && el.offsetTop - windowHeight / 3 <= scrollTop) {
      currentIndex = i
      break
    }
  }
  
  activeIndex.value = currentIndex
}

watch(() => props.visible, (val) => {
  if (val) {
    updateActiveSection()
  }
})

defineExpose({
  updateActiveSection
})
</script>
