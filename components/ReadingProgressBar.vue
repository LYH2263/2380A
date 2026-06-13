<template>
  <div 
    class="fixed bottom-0 left-0 right-0 z-40 glass border-t border-white/10"
    @click="handleBarClick"
  >
    <div class="relative h-1.5 bg-white/10 cursor-pointer">
      <div 
        class="absolute inset-y-0 left-0 bg-gradient-to-r from-neuro-primary to-neuro-secondary transition-all duration-100"
        :style="{ width: progress + '%' }"
      />
      <div 
        class="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg -ml-1.5 transition-all duration-100"
        :style="{ left: progress + '%' }"
      />
    </div>
    <div class="px-4 py-1.5 text-xs text-center text-white/60">
      阅读进度: {{ progress.toFixed(1) }}%
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  scrollContainer?: HTMLElement | null
}>()

const progress = ref(0)

const calculateProgress = () => {
  const container = props.scrollContainer
  let scrollTop: number
  let scrollHeight: number
  let clientHeight: number

  if (container) {
    scrollTop = container.scrollTop
    scrollHeight = container.scrollHeight
    clientHeight = container.clientHeight
  } else {
    scrollTop = window.scrollY || document.documentElement.scrollTop
    scrollHeight = document.documentElement.scrollHeight
    clientHeight = window.innerHeight
  }

  const maxScroll = scrollHeight - clientHeight
  if (maxScroll <= 0) {
    progress.value = 0
    return
  }

  progress.value = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100))
}

const handleBarClick = (e: MouseEvent) => {
  const target = e.currentTarget as HTMLElement
  const bar = target.querySelector('.h-1\\.5') as HTMLElement
  if (!bar) return

  const rect = bar.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const clickPercent = Math.min(100, Math.max(0, (clickX / rect.width) * 100))

  const container = props.scrollContainer
  if (container) {
    const maxScroll = container.scrollHeight - container.clientHeight
    container.scrollTo({
      top: (clickPercent / 100) * maxScroll,
      behavior: 'smooth'
    })
  } else {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo({
      top: (clickPercent / 100) * maxScroll,
      behavior: 'smooth'
    })
  }
}

let scrollListener: (() => void) | null = null

onMounted(() => {
  scrollListener = calculateProgress
  const container = props.scrollContainer
  if (container) {
    container.addEventListener('scroll', scrollListener)
  } else {
    window.addEventListener('scroll', scrollListener, { passive: true })
  }
  calculateProgress()
})

onUnmounted(() => {
  if (scrollListener) {
    const container = props.scrollContainer
    if (container) {
      container.removeEventListener('scroll', scrollListener)
    } else {
      window.removeEventListener('scroll', scrollListener)
    }
  }
})

defineExpose({
  calculateProgress
})
</script>
