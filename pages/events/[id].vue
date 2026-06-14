<template>
  <div class="min-h-screen">
    <div v-if="loading" class="p-12 text-center">
      <Icon name="ph:spinner" class="text-4xl animate-spin text-neuro-primary" />
      <p class="mt-4 text-white/50">加载中...</p>
    </div>

    <template v-else-if="eventData">
      <div class="relative">
        <div
          v-if="eventData.coverImage"
          class="h-64 md:h-80 w-full bg-cover bg-center"
          :style="{ backgroundImage: `url(${eventData.coverImage})` }"
        >
          <div class="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />
        </div>
        <div v-else class="h-32 md:h-48 w-full bg-gradient-to-r from-neuro-primary/30 via-neuro-secondary/30 to-neuro-accent/30">
          <div class="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />
        </div>
      </div>

      <div class="container mx-auto px-4 -mt-20 md:-mt-24 relative z-10">
        <div class="card p-6 md:p-8 mb-8">
          <div class="flex flex-col md:flex-row md:items-start gap-6">
            <div class="flex-1">
              <div class="flex flex-wrap items-center gap-3 mb-4">
                <span :class="['px-3 py-1 rounded-lg text-sm font-medium', typeClasses[eventData.type]]">
                  {{ typeLabels[eventData.type] }}
                </span>
                <span :class="['px-3 py-1 rounded-lg text-sm font-medium', statusClasses[eventData.status]]">
                  {{ statusLabels[eventData.status] }}
                </span>
              </div>
              <h1 class="text-3xl md:text-4xl font-bold mb-4">{{ eventData.title }}</h1>
              <p class="text-white/70 mb-6">{{ eventData.description }}</p>

              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="glass rounded-xl p-4">
                  <div class="text-sm text-white/50 mb-1">参与作品</div>
                  <div class="text-2xl font-bold">{{ eventData._count?.participations || 0 }}</div>
                </div>
                <div class="glass rounded-xl p-4">
                  <div class="text-sm text-white/50 mb-1">报名开始</div>
                  <div class="text-sm font-medium">{{ formatDate(eventData.registrationStartAt) }}</div>
                </div>
                <div class="glass rounded-xl p-4">
                  <div class="text-sm text-white/50 mb-1">报名结束</div>
                  <div class="text-sm font-medium">{{ formatDate(eventData.registrationEndAt) }}</div>
                </div>
                <div class="glass rounded-xl p-4">
                  <div class="text-sm text-white/50 mb-1">活动时间</div>
                  <div class="text-sm font-medium">
                    {{ formatShortDate(eventData.eventStartAt) }} - {{ formatShortDate(eventData.eventEndAt) }}
                  </div>
                </div>
              </div>

              <div v-if="eventData.allowedTags?.length" class="mb-6">
                <div class="text-sm text-white/50 mb-2">允许标签</div>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in eventData.allowedTags"
                    :key="tag"
                    class="px-3 py-1 bg-white/10 rounded-full text-sm"
                  >
                    #{{ tag }}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-3 md:w-56">
              <button
                v-if="canRegister"
                @click="openRegisterModal"
                class="btn-primary w-full"
              >
                <Icon name="ph:paper-plane" class="mr-2" />
                立即报名
              </button>
              <button
                v-else-if="user && userParticipation && userParticipation.status !== 'WITHDRAWN'"
                class="btn-secondary w-full"
                disabled
              >
                <Icon name="ph:check-circle" class="mr-2" />
                {{ participationStatusLabels[userParticipation.status] }}
              </button>
              <button
                v-else-if="user && userParticipation && userParticipation.status === 'WITHDRAWN'"
                @click="openRegisterModal"
                class="btn-primary w-full"
              >
                <Icon name="ph:arrow-counter-clockwise" class="mr-2" />
                重新报名
              </button>
              <button
                v-else-if="!user"
                @click="navigateTo('/auth/login')"
                class="btn-primary w-full"
              >
                <Icon name="ph:sign-in" class="mr-2" />
                登录后报名
              </button>
              <button
                v-else
                class="btn-secondary w-full"
                disabled
              >
                <Icon name="ph:clock" class="mr-2" />
                {{ registrationButtonText }}
              </button>

              <button
                v-if="user && userParticipation && userParticipation.status === 'PENDING'"
                @click="handleWithdraw"
                class="btn-secondary w-full text-red-400 hover:text-red-300"
                :loading="withdrawLoading"
              >
                <Icon name="ph:x-circle" class="mr-2" />
                撤销报名
              </button>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 mb-6">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            :class="[
              'px-6 py-3 rounded-xl text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-gradient-to-r from-neuro-primary to-neuro-secondary text-white'
                : 'glass hover:bg-white/10 text-white/70'
            ]"
          >
            <Icon :name="tab.icon" class="mr-2" />
            {{ tab.label }}
          </button>
        </div>

        <div v-show="activeTab === 'detail'" class="mb-12">
          <div class="card p-6 md:p-8">
            <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
              <Icon name="ph:info" class="text-neuro-primary" />
              活动详情
            </h2>
            <div class="text-white/80 whitespace-pre-wrap leading-relaxed mb-8">
              {{ eventData.description }}
            </div>

            <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
              <Icon name="ph:scroll" class="text-neuro-secondary" />
              参与规则
            </h2>
            <div class="text-white/80 whitespace-pre-wrap leading-relaxed">
              {{ eventData.rules }}
            </div>

            <div v-if="eventData.minWordCount || eventData.maxWordCount || eventData.requireNew" class="mt-8 pt-6 border-t border-white/10">
              <h3 class="text-lg font-bold mb-4">其他要求</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div v-if="eventData.minWordCount" class="glass rounded-xl p-4">
                  <div class="text-sm text-white/50 mb-1">最少字数</div>
                  <div class="text-xl font-bold">{{ formatNumber(eventData.minWordCount) }} 字</div>
                </div>
                <div v-if="eventData.maxWordCount" class="glass rounded-xl p-4">
                  <div class="text-sm text-white/50 mb-1">最多字数</div>
                  <div class="text-xl font-bold">{{ formatNumber(eventData.maxWordCount) }} 字</div>
                </div>
                <div v-if="eventData.requireNew" class="glass rounded-xl p-4">
                  <div class="text-sm text-white/50 mb-1">作品要求</div>
                  <div class="text-xl font-bold">需为新作品</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'participations'" class="mb-12">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold flex items-center gap-2">
              <Icon name="ph:book-open" class="text-neuro-accent" />
              参与作品
              <span class="text-white/50 text-sm font-normal">({{ participationsPagination?.total || 0 }})</span>
            </h2>
            <select v-model="participationsSortBy" class="form-input w-40" @change="fetchParticipations">
              <option value="voteCount">按投票数</option>
              <option value="viewCount">按浏览量</option>
              <option value="registeredAt">按报名时间</option>
            </select>
          </div>

          <div v-if="participationsLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <NovelCardSkeleton v-for="i in 4" :key="i" />
          </div>

          <div v-else-if="!participations.length" class="card p-12 text-center text-white/50">
            <Icon name="ph:book" class="text-4xl mb-4" />
            <p>暂无参与作品</p>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div
              v-for="p in participations"
              :key="p.id"
              class="card group overflow-hidden relative"
            >
              <NuxtLink :to="`/novels/${p.novel.id}`" class="block">
                <div class="relative aspect-[3/4] overflow-hidden">
                  <img
                    :src="p.novel.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400'"
                    :alt="p.novel.title"
                    class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between text-sm">
                    <div class="flex items-center gap-3">
                      <span class="flex items-center gap-1">
                        <Icon name="ph:eye" />
                        {{ formatNumber(p.viewCount || p.novel.viewCount || 0) }}
                      </span>
                      <span v-if="eventData.type === 'VOTING'" class="flex items-center gap-1 text-neuro-primary">
                        <Icon name="ph:heart-fill" />
                        {{ formatNumber(p.voteCount || 0) }}
                      </span>
                    </div>
                  </div>
                </div>
              </NuxtLink>

              <div class="p-4">
                <NuxtLink :to="`/novels/${p.novel.id}`" class="font-bold text-lg mb-2 line-clamp-1 group-hover:text-neuro-primary transition block">
                  {{ p.novel.title }}
                </NuxtLink>
                <p class="text-white/60 text-sm line-clamp-2 mb-3">
                  {{ p.novel.description }}
                </p>

                <div class="flex flex-wrap gap-1 mb-3">
                  <span
                    v-for="tag in (p.novel.tags || []).slice(0, 2)"
                    :key="tag"
                    class="px-2 py-0.5 bg-white/10 rounded-full text-xs text-white/70"
                  >
                    #{{ tag }}
                  </span>
                </div>

                <div class="flex items-center justify-between text-sm text-white/50">
                  <div class="flex items-center gap-2">
                    <img
                      :src="p.novel.author?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'"
                      :alt="p.novel.author?.username"
                      class="w-5 h-5 rounded-full"
                    />
                    <span>{{ p.novel.author?.username }}</span>
                  </div>
                </div>

                <button
                  v-if="eventData.type === 'VOTING' && user && !p.hasVoted && p.userId !== user.id && canVote"
                  @click="handleVote(p)"
                  class="mt-3 w-full py-2 bg-neuro-primary/20 text-neuro-primary hover:bg-neuro-primary hover:text-white rounded-lg transition text-sm font-medium"
                  :loading="votingId === p.id"
                >
                  <Icon name="ph:heart" class="mr-1" />
                  投票
                </button>
                <button
                  v-else-if="eventData.type === 'VOTING' && p.hasVoted"
                  class="mt-3 w-full py-2 bg-neuro-primary/10 text-neuro-primary/60 rounded-lg text-sm font-medium cursor-not-allowed"
                  disabled
                >
                  <Icon name="ph:heart-fill" class="mr-1" />
                  已投票
                </button>
              </div>
            </div>
          </div>

          <div v-if="participationsPagination && participationsPagination.totalPages > 1" class="mt-8 flex justify-center gap-2">
            <button
              @click="participationsPage--"
              :disabled="participationsPage <= 1 || participationsLoading"
              class="btn-secondary px-4 py-2 disabled:opacity-50"
            >
              上一页
            </button>
            <span class="px-4 py-2 text-white/70">
              {{ participationsPage }} / {{ participationsPagination.totalPages }}
            </span>
            <button
              @click="participationsPage++"
              :disabled="participationsPage >= participationsPagination.totalPages || participationsLoading"
              class="btn-secondary px-4 py-2 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>

        <div v-show="activeTab === 'ranking'" class="mb-12">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold flex items-center gap-2">
              <Icon name="ph:trophy-fill" class="text-yellow-400" />
              排行榜
            </h2>
            <select v-model="rankingSortBy" class="form-input w-40" @change="fetchRanking">
              <option value="voteCount">投票榜</option>
              <option value="viewCount">浏览榜</option>
            </select>
          </div>

          <div v-if="rankingLoading" class="card p-8">
            <div class="flex justify-center">
              <Icon name="ph:spinner" class="text-3xl animate-spin text-neuro-primary" />
            </div>
          </div>

          <div v-else-if="!ranking.length" class="card p-12 text-center text-white/50">
            <Icon name="ph:trophy" class="text-4xl mb-4" />
            <p>暂无排行数据</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="item in ranking"
              :key="item.id"
              :class="[
                'card p-4 hover:bg-white/10 transition group',
                item.rank === 1 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/30' :
                item.rank === 2 ? 'bg-gradient-to-r from-gray-400/10 to-transparent border-gray-400/30' :
                item.rank === 3 ? 'bg-gradient-to-r from-amber-600/10 to-transparent border-amber-600/30' : ''
              ]"
            >
              <div class="flex items-center gap-4">
                <div class="w-10 text-center flex-shrink-0">
                  <div v-if="item.rank === 1" class="text-3xl">🥇</div>
                  <div v-else-if="item.rank === 2" class="text-3xl">🥈</div>
                  <div v-else-if="item.rank === 3" class="text-3xl">🥉</div>
                  <span v-else class="text-xl font-bold text-white/30">{{ item.rank }}</span>
                </div>

                <NuxtLink
                  :to="`/novels/${item.novel.id}`"
                  class="w-12 h-16 flex-shrink-0 rounded overflow-hidden"
                >
                  <img
                    :src="item.novel.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200'"
                    :alt="item.novel.title"
                    class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </NuxtLink>

                <div class="flex-1 min-w-0">
                  <NuxtLink
                    :to="`/novels/${item.novel.id}`"
                    class="font-medium line-clamp-1 hover:text-neuro-primary transition block"
                  >
                    {{ item.novel.title }}
                  </NuxtLink>
                  <div class="flex items-center gap-2 mt-1 text-xs text-white/40">
                    <img
                      :src="item.novel.author?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'"
                      :alt="item.novel.author?.username"
                      class="w-4 h-4 rounded-full"
                    />
                    <span>{{ item.novel.author?.username }}</span>
                  </div>
                </div>

                <div class="text-right flex-shrink-0">
                  <div
                    :class="[
                      'text-lg font-bold',
                      rankingSortBy === 'voteCount' ? 'text-neuro-primary' : 'text-cyan-400'
                    ]"
                  >
                    <template v-if="rankingSortBy === 'voteCount'">
                      <Icon name="ph:heart-fill" class="mr-1" />
                      {{ formatNumber(item.voteCount || 0) }}
                    </template>
                    <template v-else>
                      <Icon name="ph:eye" class="mr-1" />
                      {{ formatNumber(item.viewCount || 0) }}
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="rankingPagination && rankingPagination.totalPages > 1" class="mt-8 flex justify-center gap-2">
            <button
              @click="rankingPage--"
              :disabled="rankingPage <= 1 || rankingLoading"
              class="btn-secondary px-4 py-2 disabled:opacity-50"
            >
              上一页
            </button>
            <span class="px-4 py-2 text-white/70">
              {{ rankingPage }} / {{ rankingPagination.totalPages }}
            </span>
            <button
              @click="rankingPage++"
              :disabled="rankingPage >= rankingPagination.totalPages || rankingLoading"
              class="btn-secondary px-4 py-2 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </template>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="registerModal.visible" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div class="card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 class="text-xl font-bold mb-2">选择作品报名</h3>
            <p class="text-white/60 text-sm mb-6">
              选择你已通过审核的小说参加「{{ eventData?.title }}」活动
            </p>

            <div v-if="registerModal.loading" class="p-8 text-center">
              <Icon name="ph:spinner" class="text-3xl animate-spin text-neuro-primary" />
              <p class="mt-4 text-white/50">加载作品中...</p>
            </div>

            <div v-else-if="!registerModal.novels.length" class="p-8 text-center text-white/50">
              <Icon name="ph:book" class="text-4xl mb-4" />
              <p>暂无可报名的作品</p>
              <p class="text-sm mt-2">请先创建并通过审核一部小说</p>
              <NuxtLink to="/author/novels/new" class="btn-primary mt-4 inline-flex">
                <Icon name="ph:plus" class="mr-2" />
                去创建
              </NuxtLink>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="novel in registerModal.novels"
                :key="novel.id"
                @click="registerModal.selectedId = novel.id"
                :class="[
                  'p-4 rounded-xl border-2 cursor-pointer transition',
                  registerModal.selectedId === novel.id
                    ? 'border-neuro-primary bg-neuro-primary/10'
                    : 'border-white/10 hover:border-white/20'
                ]"
              >
                <div class="flex items-center gap-4">
                  <img
                    v-if="novel.cover"
                    :src="novel.cover"
                    :alt="novel.title"
                    class="w-12 h-16 rounded-lg object-cover"
                  />
                  <div v-else class="w-12 h-16 rounded-lg bg-white/10 flex items-center justify-center">
                    <Icon name="ph:book" class="text-white/40" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium line-clamp-1">{{ novel.title }}</div>
                    <div class="text-sm text-white/50 mt-1">
                      {{ novel._count?.chapters || 0 }} 章
                    </div>
                    <div class="flex flex-wrap gap-1 mt-2">
                      <span
                        v-for="tag in (novel.tags || []).slice(0, 3)"
                        :key="tag"
                        class="px-2 py-0.5 bg-white/10 rounded-full text-xs text-white/60"
                      >
                        #{{ tag }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-4 mt-6">
              <Button @click="registerModal.visible = false" variant="secondary">取消</Button>
              <Button
                @click="confirmRegister"
                :loading="registerModal.submitting"
                variant="primary"
                :disabled="!registerModal.selectedId"
              >
                确认报名
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const toast = useToast()
const { user, fetchUser } = useAuth()

const eventId = computed(() => Number(route.params.id))

await fetchUser()

const loading = ref(true)
const eventData = ref<any>(null)
const userParticipation = ref<any>(null)

const tabs = [
  { key: 'detail', label: '活动详情', icon: 'ph:info' },
  { key: 'participations', label: '参与作品', icon: 'ph:book-open' },
  { key: 'ranking', label: '排行榜', icon: 'ph:trophy' }
]
const activeTab = ref('detail')

const participationsLoading = ref(false)
const participations = ref<any[]>([])
const participationsPage = ref(1)
const participationsPagination = ref<any>(null)
const participationsSortBy = ref('voteCount')

const rankingLoading = ref(false)
const ranking = ref<any[]>([])
const rankingPage = ref(1)
const rankingPagination = ref<any>(null)
const rankingSortBy = ref('voteCount')

const votingId = ref<number | null>(null)
const withdrawLoading = ref(false)

const registerModal = ref({
  visible: false,
  loading: false,
  submitting: false,
  novels: [] as any[],
  selectedId: null as number | null
})

const statusLabels: Record<string, string> = {
  DRAFT: '草稿',
  UPCOMING: '即将开始',
  ONGOING: '进行中',
  ENDED: '已结束',
  CANCELLED: '已取消'
}

const statusClasses: Record<string, string> = {
  DRAFT: 'bg-gray-500/20 text-gray-400',
  UPCOMING: 'bg-blue-500/20 text-blue-400',
  ONGOING: 'bg-green-500/20 text-green-400',
  ENDED: 'bg-purple-500/20 text-purple-400',
  CANCELLED: 'bg-red-500/20 text-red-400'
}

const typeLabels: Record<string, string> = {
  CONTEST: '征文大赛',
  VOTING: '投票活动',
  COLLECTION: '作品征集',
  PROMOTION: '推广活动'
}

const typeClasses: Record<string, string> = {
  CONTEST: 'bg-pink-500/20 text-pink-400',
  VOTING: 'bg-cyan-500/20 text-cyan-400',
  COLLECTION: 'bg-amber-500/20 text-amber-400',
  PROMOTION: 'bg-violet-500/20 text-violet-400'
}

const participationStatusLabels: Record<string, string> = {
  PENDING: '审核中',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  WITHDRAWN: '已撤销'
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const formatShortDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatNumber = (num: number) => {
  if (!num) return '0'
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

const now = computed(() => new Date())

const isRegistrationOpen = computed(() => {
  if (!eventData.value) return false
  const regStart = new Date(eventData.value.registrationStartAt)
  const regEnd = new Date(eventData.value.registrationEndAt)
  return now.value >= regStart && now.value <= regEnd
})

const canVote = computed(() => {
  if (!eventData.value) return false
  if (eventData.value.type !== 'VOTING') return false
  if (eventData.value.status !== 'ONGOING') return false
  const eventStart = new Date(eventData.value.eventStartAt)
  const eventEnd = new Date(eventData.value.eventEndAt)
  return now.value >= eventStart && now.value <= eventEnd
})

const canRegister = computed(() => {
  if (!user.value) return false
  if (!isRegistrationOpen.value) return false
  if (!eventData.value) return false
  if (['DRAFT', 'CANCELLED'].includes(eventData.value.status)) return false
  return true
})

const registrationButtonText = computed(() => {
  if (!eventData.value) return ''
  if (eventData.value.status === 'DRAFT' || eventData.value.status === 'CANCELLED') return '活动不可报名'
  const regStart = new Date(eventData.value.registrationStartAt)
  const regEnd = new Date(eventData.value.registrationEndAt)
  if (now.value < regStart) return '报名尚未开始'
  if (now.value > regEnd) return '报名已结束'
  return ''
})

const fetchEvent = async () => {
  loading.value = true
  try {
    const data: any = await $fetch(`/api/events/${eventId.value}`)
    eventData.value = data.event
  } catch (e: any) {
    toast.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const fetchParticipations = async () => {
  participationsLoading.value = true
  try {
    const data: any = await $fetch(`/api/events/${eventId.value}/participations`, {
      query: {
        page: participationsPage.value,
        limit: 20,
        sortBy: participationsSortBy.value
      }
    })
    participations.value = data.participations
    participationsPagination.value = data.pagination

    if (user.value) {
      const mine = data.participations.find((p: any) => p.userId === user.value?.id)
      if (mine) userParticipation.value = mine
    }
  } catch (e: any) {
    toast.error(e.message || '加载失败')
  } finally {
    participationsLoading.value = false
  }
}

const fetchRanking = async () => {
  rankingLoading.value = true
  try {
    const data: any = await $fetch(`/api/events/${eventId.value}/ranking`, {
      query: {
        page: rankingPage.value,
        limit: 20,
        sortBy: rankingSortBy.value
      }
    })
    ranking.value = data.ranking
    rankingPagination.value = data.pagination
  } catch (e: any) {
    toast.error(e.message || '加载失败')
  } finally {
    rankingLoading.value = false
  }
}

const handleVote = async (participation: any) => {
  if (!user.value) {
    navigateTo('/auth/login')
    return
  }
  votingId.value = participation.id
  try {
    await $fetch('/api/events/vote', {
      method: 'POST',
      body: { participationId: participation.id }
    })
    toast.success('投票成功')
    participation.voteCount = (participation.voteCount || 0) + 1
    participation.hasVoted = true
    fetchRanking()
  } catch (e: any) {
    toast.error(e.message || '投票失败')
  } finally {
    votingId.value = null
  }
}

const handleWithdraw = async () => {
  if (!userParticipation.value) return
  withdrawLoading.value = true
  try {
    await $fetch(`/api/events/participations/${userParticipation.value.id}/withdraw`, {
      method: 'POST'
    })
    toast.success('已撤销报名')
    userParticipation.value.status = 'WITHDRAWN'
  } catch (e: any) {
    toast.error(e.message || '撤销失败')
  } finally {
    withdrawLoading.value = false
  }
}

const openRegisterModal = async () => {
  registerModal.value = {
    visible: true,
    loading: true,
    submitting: false,
    novels: [],
    selectedId: null
  }
  try {
    const data: any = await $fetch('/api/author/novels', { query: { limit: 50 } })
    registerModal.value.novels = (data.novels || []).filter((n: any) => n.reviewStatus === 'APPROVED')
  } catch (e: any) {
    toast.error(e.message || '加载作品失败')
  } finally {
    registerModal.value.loading = false
  }
}

const confirmRegister = async () => {
  if (!registerModal.value.selectedId) return
  registerModal.value.submitting = true
  try {
    const data: any = await $fetch('/api/events/register', {
      method: 'POST',
      body: {
        eventId: eventId.value,
        novelId: registerModal.value.selectedId
      }
    })
    toast.success(data.message || '报名成功')
    registerModal.value.visible = false
    fetchParticipations()
  } catch (e: any) {
    toast.error(e.message || '报名失败')
  } finally {
    registerModal.value.submitting = false
  }
}

watch(participationsPage, fetchParticipations)
watch(rankingPage, fetchRanking)

await fetchEvent()

if (eventData.value) {
  fetchParticipations()
  fetchRanking()
}

useHead(() => ({
  title: eventData.value ? `${eventData.value.title} - 活动` : '活动详情',
  meta: eventData.value ? [
    { name: 'description', content: eventData.value.description }
  ] : []
}))
</script>
