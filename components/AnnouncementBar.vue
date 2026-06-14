<template>
  <Transition
    enter-active-class="transition duration-300"
    enter-from-class="-translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-200"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-full opacity-0"
  >
    <div
      v-if="visible && announcements.length > 0"
      :class="[
        'w-full border-b overflow-hidden',
        currentAnnouncement ? getBarBgClass(currentAnnouncement.priority) : 'bg-white/5 border-white/10'
      ]"
    >
      <div class="relative flex items-center">
        <div class="flex-shrink-0 px-4 py-3 flex items-center gap-2">
          <Icon
            :name="currentAnnouncement && ['URGENT', 'HIGH'].includes(currentAnnouncement.priority) ? 'ph:warning-fill' : 'ph:megaphone'"
            :class="[
              'animate-pulse',
              currentAnnouncement?.priority === 'URGENT' ? 'text-red-400' :
              currentAnnouncement?.priority === 'HIGH' ? 'text-orange-400' : 'text-neuro-primary'
            ]"
          />
          <span class="text-xs font-medium text-white/70 hidden sm:inline">公告</span>
        </div>

        <div class="flex-1 overflow-hidden relative h-10">
          <div
            class="absolute whitespace-nowrap py-2.5 animate-marquee"
            @click="openDetailModal(currentAnnouncement)"
            class="cursor-pointer hover:text-neuro-primary transition"
          >
            <span
              v-for="(announcement, idx) in announcements"
              :key="announcement.id"
              class="mr-16"
            >
              <span :class="['px-2 py-0.5 rounded text-xs font-medium mr-2', getPriorityClass(announcement.priority)]">
                {{ announcement.priority }}
              </span>
              <span class="text-sm">{{ announcement.title }}</span>
            </span>
            <template v-if="announcements.length > 0">
              <span
                v-for="(announcement, idx) in announcements"
                :key="'dup-' + announcement.id"
                class="mr-16"
              >
                <span :class="['px-2 py-0.5 rounded text-xs font-medium mr-2', getPriorityClass(announcement.priority)]">
                  {{ announcement.priority }}
                </span>
                <span class="text-sm">{{ announcement.title }}</span>
              </span>
            </template>
          </div>
        </div>

        <div class="flex-shrink-0 px-3 py-3 flex items-center gap-1">
          <button
            @click="prevAnnouncement"
            class="p-1.5 hover:bg-white/10 rounded-lg transition"
            title="上一条"
          >
            <Icon name="ph:caret-left" />
          </button>
          <button
            @click="nextAnnouncement"
            class="p-1.5 hover:bg-white/10 rounded-lg transition"
            title="下一条"
          >
            <Icon name="ph:caret-right" />
          </button>
          <button
            v-if="currentAnnouncement"
            @click="dismissAnnouncement(currentAnnouncement.id)"
            class="p-1.5 hover:bg-white/10 rounded-lg transition ml-1"
            title="不再显示此公告"
          >
            <Icon name="ph:eye-slash" />
          </button>
          <button
            @click="closeTemporarily"
            class="p-1.5 hover:bg-white/10 rounded-lg transition"
            title="暂时关闭"
          >
            <Icon name="ph:x" />
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="detailModal.visible" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div class="card p-6 max-w-xl w-full max-h-[80vh] overflow-y-auto">
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <span :class="['px-2 py-1 rounded text-xs font-medium', getPriorityClass(detailModal.announcement?.priority)]">
                {{ detailModal.announcement?.priority }}
              </span>
              <h3 class="text-xl font-bold truncate">{{ detailModal.announcement?.title }}</h3>
            </div>
            <button
              @click="detailModal.visible = false"
              class="p-1 hover:bg-white/10 rounded-lg transition flex-shrink-0"
            >
              <Icon name="ph:x" />
            </button>
          </div>
          <div class="text-xs text-white/40 mb-4">
            发布时间：{{ formatDate(detailModal.announcement?.createdAt) }}
          </div>
          <div class="prose prose-invert max-w-none whitespace-pre-wrap break-words">
            {{ detailModal.announcement?.content }}
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
            <button
              v-if="detailModal.announcement"
              @click="dismissAnnouncement(detailModal.announcement.id); detailModal.visible = false"
              class="btn-secondary"
            >
              <Icon name="ph:eye-slash" class="mr-2" />
              不再显示
            </button>
            <button
              @click="detailModal.visible = false"
              class="btn-primary"
            >
              我知道了
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const toast = useToast()

const announcements = ref<any[]>([])
const currentIndex = ref(0)
const visible = ref(true)
const dismissLoading = ref(false)

const detailModal = ref({
  visible: false,
  announcement: null as any
})

const currentAnnouncement = computed(() => {
  if (announcements.value.length === 0) return null
  return announcements.value[currentIndex.value]
})

const getPriorityClass = (priority: string) => {
  const classes: Record<string, string> = {
    URGENT: 'bg-red-500/20 text-red-400',
    HIGH: 'bg-orange-500/20 text-orange-400',
    MEDIUM: 'bg-yellow-500/20 text-yellow-400',
    LOW: 'bg-blue-500/20 text-blue-400'
  }
  return classes[priority] || 'bg-blue-500/20 text-blue-400'
}

const getBarBgClass = (priority: string) => {
  if (priority === 'URGENT') return 'bg-red-500/10 border-red-500/30'
  if (priority === 'HIGH') return 'bg-orange-500/10 border-orange-500/30'
  return 'bg-white/5 border-white/10'
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const openDetailModal = (announcement: any) => {
  if (!announcement) return
  detailModal.value = {
    visible: true,
    announcement
  }
}

const nextAnnouncement = () => {
  if (announcements.value.length === 0) return
  currentIndex.value = (currentIndex.value + 1) % announcements.value.length
}

const prevAnnouncement = () => {
  if (announcements.value.length === 0) return
  currentIndex.value = (currentIndex.value - 1 + announcements.value.length) % announcements.value.length
}

const dismissAnnouncement = async (id: number) => {
  dismissLoading.value = true
  try {
    await $fetch('/api/announcements/dismiss', {
      method: 'POST',
      body: { announcementId: id }
    })
    toast.success('已设置不再显示此公告')
    announcements.value = announcements.value.filter(a => a.id !== id)
    if (currentIndex.value >= announcements.value.length) {
      currentIndex.value = Math.max(0, announcements.value.length - 1)
    }
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  } finally {
    dismissLoading.value = false
  }
}

const closeTemporarily = () => {
  visible.value = false
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('announcement_bar_closed', '1')
  }
}

const checkTemporarilyClosed = () => {
  if (typeof sessionStorage !== 'undefined') {
    const closed = sessionStorage.getItem('announcement_bar_closed')
    if (closed === '1') {
      visible.value = false
    }
  }
}

const fetchAnnouncements = async () => {
  try {
    const data: any = await $fetch('/api/announcements/active')
    announcements.value = data.announcements || []
    if (announcements.value.length > 0) {
      currentIndex.value = 0
    }
  } catch (e: any) {
    console.error('Failed to fetch announcements:', e)
  }
}

let autoSwitchTimer: ReturnType<typeof setInterval> | null = null

const startAutoSwitch = () => {
  stopAutoSwitch()
  autoSwitchTimer = setInterval(() => {
    if (announcements.value.length > 1) {
      nextAnnouncement()
    }
  }, 8000)
}

const stopAutoSwitch = () => {
  if (autoSwitchTimer) {
    clearInterval(autoSwitchTimer)
    autoSwitchTimer = null
  }
}

checkTemporarilyClosed()
fetchAnnouncements()

onMounted(() => {
  startAutoSwitch()
})

onBeforeUnmount(() => {
  stopAutoSwitch()
})
</script>

<style scoped>
@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.animate-marquee {
  animation: marquee 30s linear infinite;
}

.animate-marquee:hover {
  animation-play-state: paused;
}
</style>
