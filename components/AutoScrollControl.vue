<template>
  <div class="fixed right-4 top-1/2 -translate-y-1/2 z-30">
    <div class="glass rounded-2xl p-3 space-y-3">
      <button
        @click="toggleScroll"
        class="w-10 h-10 rounded-xl flex items-center justify-center transition"
        :class="isScrolling ? 'bg-neuro-primary text-white' : 'hover:bg-white/10'"
        :title="isScrolling ? '暂停滚动' : '开始自动滚动'"
      >
        <Icon v-if="isScrolling" name="ph:pause-fill" />
        <Icon v-else name="ph:play-fill" />
      </button>

      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div v-if="isScrolling || showControls" class="space-y-2 pt-2 border-t border-white/10">
          <div class="text-xs text-center text-white/60">{{ speed }}档</div>
          <div class="flex flex-col items-center gap-1">
            <button
              @click="increaseSpeed"
              class="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-sm"
              :disabled="speed >= 10"
            >
              <Icon name="ph:caret-up" />
            </button>
            <div class="text-xs font-bold text-neuro-primary">{{ speed }}</div>
            <button
              @click="decreaseSpeed"
              class="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-sm"
              :disabled="speed <= 1"
            >
              <Icon name="ph:caret-down" />
            </button>
          </div>
        </div>
      </Transition>

      <button
        @click="showControls = !showControls"
        class="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center text-sm"
        :title="showControls ? '隐藏速度' : '调节速度'"
      >
        <Icon name="ph:sliders-horizontal" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useReadingSettings } from '~/composables/useReadingSettings'

const props = defineProps<{
  scrollContainer?: HTMLElement | null
}>()

const emit = defineEmits<{
  (e: 'scroll-end'): void
}>()

const { settings, updateSettings } = useReadingSettings()

const isScrolling = ref(false)
const showControls = ref(false)
const scrollInterval = ref<number | null>(null)

const speed = computed({
  get: () => settings.value.autoScrollSpeed,
  set: (val: number) => updateSettings({ autoScrollSpeed: val })
})

const scrollSpeedMap: Record<number, number> = {
  1: 0.5,
  2: 1,
  3: 1.5,
  4: 2,
  5: 3,
  6: 4,
  7: 5,
  8: 7,
  9: 10,
  10: 15
}

const toggleScroll = () => {
  if (isScrolling.value) {
    stopScroll()
  } else {
    startScroll()
  }
}

const startScroll = () => {
  if (isScrolling.value) return
  
  isScrolling.value = true
  
  const scrollStep = () => {
    const container = props.scrollContainer || window
    const speedVal = scrollSpeedMap[speed.value] || 2
    
    if (props.scrollContainer) {
      const el = props.scrollContainer
      const maxScroll = el.scrollHeight - el.clientHeight
      if (el.scrollTop >= maxScroll - 1) {
        stopScroll()
        emit('scroll-end')
        return
      }
      el.scrollTop += speedVal
    } else {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      if (window.scrollY >= maxScroll - 1) {
        stopScroll()
        emit('scroll-end')
        return
      }
      window.scrollBy(0, speedVal)
    }
  }
  
  scrollInterval.value = window.setInterval(scrollStep, 16)
}

const stopScroll = () => {
  isScrolling.value = false
  if (scrollInterval.value) {
    clearInterval(scrollInterval.value)
    scrollInterval.value = null
  }
}

const increaseSpeed = () => {
  if (speed.value < 10) {
    speed.value = speed.value + 1
  }
}

const decreaseSpeed = () => {
  if (speed.value > 1) {
    speed.value = speed.value - 1
  }
}

onUnmounted(() => {
  stopScroll()
})

watch(speed, () => {
  if (isScrolling.value) {
    stopScroll()
    startScroll()
  }
})
</script>
