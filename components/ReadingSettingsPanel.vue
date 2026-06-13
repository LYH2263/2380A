<template>
  <Transition
    enter-active-class="transition duration-300"
    enter-from-class="opacity-0 translate-x-full"
    enter-to-class="opacity-100 translate-x-0"
    leave-active-class="transition duration-200"
    leave-from-class="opacity-100 translate-x-0"
    leave-to-class="opacity-0 translate-x-full"
  >
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex justify-end"
      @click.self="$emit('close')"
    >
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('close')" />
      
      <div
        class="relative w-80 max-w-full h-full overflow-y-auto glass border-l border-white/10 p-6 space-y-6"
        @click.stop
      >
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold">阅读设置</h3>
          <button @click="$emit('close')" class="p-2 rounded-lg hover:bg-white/10 transition">
            <Icon name="ph:x" />
          </button>
        </div>

        <div class="space-y-6">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">字体大小</span>
              <span class="text-sm text-white/60">{{ settings.fontSize }}px</span>
            </div>
            <div class="flex items-center gap-3">
              <button
                @click="decreaseFontSize"
                class="w-8 h-8 rounded-lg glass flex items-center justify-center hover:bg-white/10 transition"
                :disabled="settings.fontSize <= 14"
              >
                <Icon name="ph:minus" />
              </button>
              <input
                type="range"
                :value="settings.fontSize"
                @input="onFontSizeInput"
                min="14"
                max="24"
                step="1"
                class="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neuro-primary"
              />
              <button
                @click="increaseFontSize"
                class="w-8 h-8 rounded-lg glass flex items-center justify-center hover:bg-white/10 transition"
                :disabled="settings.fontSize >= 24"
              >
                <Icon name="ph:plus" />
              </button>
            </div>
          </div>

          <div class="space-y-3">
            <span class="text-sm font-medium">字体选择</span>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="font in fontOptions"
                :key="font.value"
                @click="updateSettings({ fontFamily: font.value })"
                class="px-3 py-2 rounded-lg text-sm transition"
                :class="settings.fontFamily === font.value ? 'bg-neuro-primary text-white' : 'glass hover:bg-white/10'"
              >
                {{ font.label }}
              </button>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">行高</span>
              <span class="text-sm text-white/60">{{ settings.lineHeight.toFixed(1) }}倍</span>
            </div>
            <input
              type="range"
              :value="settings.lineHeight"
              @input="onLineHeightInput"
              min="1.5"
              max="2.5"
              step="0.1"
              class="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neuro-primary"
            />
          </div>

          <div class="space-y-3">
            <span class="text-sm font-medium">背景主题</span>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="theme in themeOptions"
                :key="theme.value"
                @click="updateSettings({ theme: theme.value })"
                class="p-3 rounded-lg text-left text-sm transition border-2"
                :class="[
                  settings.theme === theme.value ? 'border-neuro-primary' : 'border-transparent',
                  theme.bgClass
                ]"
              >
                <span :class="theme.textClass">{{ theme.label }}</span>
              </button>
            </div>
          </div>

          <div class="space-y-3">
            <span class="text-sm font-medium">页面宽度</span>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="width in widthOptions"
                :key="width.value"
                @click="updateSettings({ pageWidth: width.value })"
                class="px-3 py-2 rounded-lg text-sm transition"
                :class="settings.pageWidth === width.value ? 'bg-neuro-primary text-white' : 'glass hover:bg-white/10'"
              >
                {{ width.label }}
              </button>
            </div>
          </div>

          <div class="space-y-3">
            <span class="text-sm font-medium">夜间模式</span>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="mode in nightModeOptions"
                :key="mode.value"
                @click="updateSettings({ nightMode: mode.value })"
                class="px-3 py-2 rounded-lg text-sm transition"
                :class="settings.nightMode === mode.value ? 'bg-neuro-primary text-white' : 'glass hover:bg-white/10'"
              >
                {{ mode.label }}
              </button>
            </div>
          </div>

          <div class="pt-4 border-t border-white/10">
            <button
              @click="resetSettings"
              class="w-full px-4 py-2 rounded-lg text-sm glass hover:bg-white/10 transition"
            >
              恢复默认设置
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useReadingSettings } from '~/composables/useReadingSettings'

defineProps<{
  visible: boolean
}>()

defineEmits<{
  (e: 'close'): void
}>()

const { settings, updateSettings, resetSettings } = useReadingSettings()

const fontOptions = [
  { value: 'system', label: '系统默认' },
  { value: 'song', label: '宋体' },
  { value: 'kai', label: '楷体' }
]

const themeOptions = [
  { value: 'default', label: '默认渐变', bgClass: 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900', textClass: 'text-white' },
  { value: 'eye-care', label: '护眼绿', bgClass: 'bg-gradient-to-br from-emerald-950 via-green-900 to-emerald-950', textClass: 'text-emerald-100' },
  { value: 'parchment', label: '羊皮纸', bgClass: 'bg-gradient-to-br from-amber-100 via-orange-100 to-amber-200', textClass: 'text-stone-800' },
  { value: 'night', label: '夜间深色', bgClass: 'bg-gradient-to-br from-gray-950 via-zinc-900 to-gray-950', textClass: 'text-gray-300' }
]

const widthOptions = [
  { value: 'narrow', label: '窄' },
  { value: 'medium', label: '中' },
  { value: 'wide', label: '宽' }
]

const nightModeOptions = [
  { value: 'auto', label: '跟随系统' },
  { value: 'on', label: '开启' },
  { value: 'off', label: '关闭' }
]

const increaseFontSize = () => {
  if (settings.value.fontSize < 24) {
    updateSettings({ fontSize: settings.value.fontSize + 1 })
  }
}

const decreaseFontSize = () => {
  if (settings.value.fontSize > 14) {
    updateSettings({ fontSize: settings.value.fontSize - 1 })
  }
}

const onFontSizeInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  updateSettings({ fontSize: parseInt(target.value) })
}

const onLineHeightInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  updateSettings({ lineHeight: parseFloat(target.value) })
}
</script>
