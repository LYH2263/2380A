<template>
  <div
    v-if="banners.length > 0"
    class="relative w-full overflow-hidden rounded-2xl group"
    @mouseenter="pauseAutoPlay"
    @mouseleave="resumeAutoPlay"
  >
    <div
      class="relative aspect-[21/9] md:aspect-[3/1] lg:aspect-[4/1] bg-gradient-to-br from-neuro-primary/20 via-neuro-secondary/20 to-neuro-accent/20"
    >
      <TransitionGroup
        name="carousel"
        tag="div"
        class="absolute inset-0"
      >
        <div
          v-for="(banner, index) in banners"
          :key="banner.id"
          v-show="index === currentIndex"
          class="absolute inset-0"
        >
          <NuxtLink
            v-if="banner.linkUrl"
            :to="banner.linkUrl"
            class="block w-full h-full"
            target="_blank"
          >
            <img
              :src="banner.imageUrl"
              :alt="banner.title"
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div class="absolute bottom-0 left-0 right-0 p-4 md:p-8">
              <h3 class="text-xl md:text-3xl font-bold text-white drop-shadow-lg">
                {{ banner.title }}
              </h3>
            </div>
          </NuxtLink>
          <div v-else class="w-full h-full">
            <img
              :src="banner.imageUrl"
              :alt="banner.title"
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div class="absolute bottom-0 left-0 right-0 p-4 md:p-8">
              <h3 class="text-xl md:text-3xl font-bold text-white drop-shadow-lg">
                {{ banner.title }}
              </h3>
            </div>
          </div>
        </div>
      </TransitionGroup>

      <button
        v-if="banners.length > 1"
        @click="prevSlide"
        class="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm"
        title="上一张"
      >
        <Icon name="ph:caret-left" class="text-xl md:text-2xl" />
      </button>

      <button
        v-if="banners.length > 1"
        @click="nextSlide"
        class="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm"
        title="下一张"
      >
        <Icon name="ph:caret-right" class="text-xl md:text-2xl" />
      </button>
    </div>

    <div
      v-if="banners.length > 1"
      class="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2"
    >
      <button
        v-for="(banner, index) in banners"
        :key="'dot-' + banner.id"
        @click="goToSlide(index)"
        :class="[
          'h-2 rounded-full transition-all duration-300',
          index === currentIndex
            ? 'w-8 bg-white'
            : 'w-2 bg-white/50 hover:bg-white/80'
        ]"
        :title="banner.title"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const banners = ref<any[]>([])
const currentIndex = ref(0)
const isPaused = ref(false)

let autoPlayTimer: ReturnType<typeof setInterval> | null = null

const nextSlide = () => {
  if (banners.value.length === 0) return
  currentIndex.value = (currentIndex.value + 1) % banners.value.length
}

const prevSlide = () => {
  if (banners.value.length === 0) return
  currentIndex.value = (currentIndex.value - 1 + banners.value.length) % banners.value.length
}

const goToSlide = (index: number) => {
  currentIndex.value = index
}

const startAutoPlay = () => {
  stopAutoPlay()
  if (banners.value.length > 1) {
    autoPlayTimer = setInterval(() => {
      if (!isPaused.value) {
        nextSlide()
      }
    }, 5000)
  }
}

const stopAutoPlay = () => {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer)
    autoPlayTimer = null
  }
}

const pauseAutoPlay = () => {
  isPaused.value = true
}

const resumeAutoPlay = () => {
  isPaused.value = false
}

const fetchBanners = async () => {
  try {
    const data: any = await $fetch('/api/banners/active')
    banners.value = data.banners || []
    currentIndex.value = 0
  } catch (e: any) {
    console.error('Failed to fetch banners:', e)
  }
}

fetchBanners()

onMounted(() => {
  startAutoPlay()
})

onBeforeUnmount(() => {
  stopAutoPlay()
})
</script>

<style scoped>
.carousel-enter-active,
.carousel-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.carousel-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.carousel-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.carousel-move {
  transition: transform 0.5s ease;
}
</style>
