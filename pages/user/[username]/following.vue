<template>
  <div class="min-h-screen py-8">
    <div class="container mx-auto px-4">
      <div class="flex items-center gap-4 mb-8">
        <NuxtLink :to="`/user/${username}`" class="text-white/60 hover:text-white transition">
          <Icon name="ph:arrow-left" class="text-xl" />
        </NuxtLink>
        <h1 class="text-2xl font-bold">{{ username }} 的关注</h1>
      </div>

      <div v-if="pending" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="i in 6" :key="i" class="card p-6">
          <div class="flex items-center gap-4">
            <div class="skeleton w-14 h-14 rounded-full" />
            <div class="flex-1 space-y-2">
              <div class="skeleton h-5 w-24" />
              <div class="skeleton h-4 w-32" />
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="following.length === 0" class="text-center py-20">
        <Icon name="ph:users" class="text-6xl text-white/30 mb-4" />
        <p class="text-xl text-white/50">还没有关注任何人</p>
        <NuxtLink :to="`/user/${username}`" class="btn-primary mt-4 inline-block">
          返回主页
        </NuxtLink>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="user in following"
          :key="user.id"
          class="card p-6 hover:border-neuro-primary/50 transition-all"
        >
          <div class="flex items-center gap-4">
            <NuxtLink :to="`/user/${user.username}`">
              <img
                :src="user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.username"
                :alt="user.username"
                class="w-14 h-14 rounded-full border-2 border-white/10 hover:border-neuro-primary/50 transition"
              />
            </NuxtLink>
            <div class="flex-1 min-w-0">
              <NuxtLink
                :to="`/user/${user.username}`"
                class="font-semibold hover:text-neuro-primary transition truncate block"
              >
                {{ user.username }}
              </NuxtLink>
              <p v-if="user.bio" class="text-sm text-white/50 truncate">
                {{ user.bio }}
              </p>
              <p v-else class="text-sm text-white/30 italic">
                这个人很懒...
              </p>
            </div>
            <div v-if="currentUser?.username !== user.username">
              <Button
                :variant="user.isFollowing ? 'secondary' : 'primary'"
                size="sm"
                :loading="followLoadingMap[user.id]"
                @click="handleFollow(user)"
              >
                <span class="flex items-center gap-1">
                  <Icon :name="user.isFollowing ? 'ph:user-check' : 'ph:user-plus'" class="text-sm" />
                  {{ user.isFollowing ? '已关注' : '关注' }}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="pagination && pagination.totalPages > 1" class="flex justify-center gap-2 mt-8">
        <Button
          variant="secondary"
          size="sm"
          :disabled="page <= 1"
          @click="page--"
        >
          上一页
        </Button>
        <span class="px-4 py-2 text-white/60">
          {{ page }} / {{ pagination.totalPages }}
        </span>
        <Button
          variant="secondary"
          size="sm"
          :disabled="page >= pagination.totalPages"
          @click="page++"
        >
          下一页
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'

const route = useRoute()
const { user: currentUser } = useAuth()
const username = computed(() => route.params.username as string)

const page = ref(1)
const followLoadingMap = ref<Record<number, boolean>>({})

const { data, pending, refresh } = await useFetch(
  () => `/api/user/${username.value}/following?page=${page.value}`,
  { watch: [username, page] }
)

const following = computed(() => data.value?.following || [])
const pagination = computed(() => data.value?.pagination)

const handleFollow = async (user: any) => {
  if (!currentUser.value) {
    await navigateTo('/auth/login')
    return
  }

  followLoadingMap.value[user.id] = true
  try {
    const { data: result } = await useFetch(`/api/user/${user.username}/follow`, {
      method: 'POST'
    })
    if (result.value?.success) {
      refresh()
    }
  } catch (error: any) {
    console.error('操作失败:', error)
  } finally {
    followLoadingMap.value[user.id] = false
  }
}

useHead(() => ({
  title: `${username.value} 的关注 - Neurosama 粉丝小说站`
}))
</script>
