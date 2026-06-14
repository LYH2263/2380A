export interface ReadingSettings {
  fontSize: number
  fontFamily: 'system' | 'song' | 'kai'
  lineHeight: number
  theme: 'default' | 'eye-care' | 'parchment' | 'night'
  pageWidth: 'narrow' | 'medium' | 'wide'
  autoScrollSpeed: number
  nightMode: 'auto' | 'on' | 'off'
}

const STORAGE_KEY = 'reading-settings'

const defaultSettings: ReadingSettings = {
  fontSize: 18,
  fontFamily: 'system',
  lineHeight: 1.8,
  theme: 'default',
  pageWidth: 'medium',
  autoScrollSpeed: 3,
  nightMode: 'auto'
}

const settings = ref<ReadingSettings>({ ...defaultSettings })
const isDark = ref(false)
const originalBodyClasses = ref<string[]>([])
const originalHtmlClasses = ref<string[]>([])
const themeApplied = ref(false)

export function useReadingSettings() {
  if (process.client) {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        settings.value = { ...defaultSettings, ...parsed }
      } catch (e) {
        settings.value = { ...defaultSettings }
      }
    }
  }

  const persist = () => {
    if (process.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
    }
  }

  const updateSettings = (partial: Partial<ReadingSettings>) => {
    settings.value = { ...settings.value, ...partial }
    persist()
  }

  const resetSettings = () => {
    settings.value = { ...defaultSettings }
    persist()
  }

  const fontFamilyMap: Record<string, string> = {
    system: 'Inter, system-ui, sans-serif',
    song: 'SimSun, 宋体, Source Han Serif SC, serif',
    kai: 'KaiTi, 楷体, STKaiti, cursive'
  }

  const fontFamilyCss = computed(() => {
    const font = fontFamilyMap[settings.value.fontFamily]
    if (settings.value.fontFamily === 'system') {
      return font
    }
    const fonts = font.split(', ').map(f => {
      if (f.includes(' ') && !f.includes('"') && !f.includes("'")) {
        return `"${f}"`
      }
      return f
    })
    return fonts.join(', ')
  })

  const pageWidthMap: Record<string, string> = {
    narrow: 'max-w-2xl',
    medium: 'max-w-3xl',
    wide: 'max-w-5xl'
  }

  const isLightTheme = computed(() => {
    return effectiveTheme.value === 'parchment'
  })

  const themeStyles = computed(() => {
    const theme = effectiveTheme.value
    const styles: Record<string, { bg: string; text: string; accent: string; glassBg: string; glassBorder: string; cardBg: string; inputBg: string; inputBorder: string }> = {
      default: {
        bg: 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900',
        text: 'text-gray-200',
        accent: 'bg-white/5 hover:bg-white/10',
        glassBg: 'bg-white/5',
        glassBorder: 'border-white/10',
        cardBg: 'bg-white/5',
        inputBg: 'bg-white/10',
        inputBorder: 'border-white/20'
      },
      'eye-care': {
        bg: 'bg-gradient-to-br from-emerald-950 via-green-900 to-emerald-950',
        text: 'text-emerald-100',
        accent: 'bg-white/5 hover:bg-white/10',
        glassBg: 'bg-white/5',
        glassBorder: 'border-white/10',
        cardBg: 'bg-white/5',
        inputBg: 'bg-white/10',
        inputBorder: 'border-white/20'
      },
      parchment: {
        bg: 'bg-gradient-to-br from-amber-100 via-orange-100 to-amber-200',
        text: 'text-stone-800',
        accent: 'bg-stone-900/10 hover:bg-stone-900/20',
        glassBg: 'bg-stone-100/80',
        glassBorder: 'border-stone-300/50',
        cardBg: 'bg-stone-50/80',
        inputBg: 'bg-stone-200/50',
        inputBorder: 'border-stone-300'
      },
      night: {
        bg: 'bg-gradient-to-br from-gray-950 via-zinc-900 to-gray-950',
        text: 'text-gray-300',
        accent: 'bg-white/5 hover:bg-white/10',
        glassBg: 'bg-white/5',
        glassBorder: 'border-white/10',
        cardBg: 'bg-white/5',
        inputBg: 'bg-white/10',
        inputBorder: 'border-white/20'
      }
    }
    return styles[theme] || styles.default
  })

  const checkSystemDark = () => {
    if (process.client && window.matchMedia) {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
  }

  const isNightMode = computed(() => {
    if (settings.value.nightMode === 'on') return true
    if (settings.value.nightMode === 'off') return false
    return isDark.value
  })

  const effectiveTheme = computed(() => {
    if (isNightMode.value && settings.value.theme !== 'night') {
      return 'night'
    }
    return settings.value.theme
  })

  const saveOriginalClasses = () => {
    if (!process.client) return
    const body = document.body
    const html = document.documentElement
    originalBodyClasses.value = [...body.classList]
    originalHtmlClasses.value = [...html.classList]
  }

  const applyThemeToBody = () => {
    if (!process.client) return
    
    if (!themeApplied.value) {
      saveOriginalClasses()
      themeApplied.value = true
    }
    
    const theme = effectiveTheme.value
    const body = document.body
    const html = document.documentElement
    
    const themeBgClasses = [
      'from-slate-900', 'via-purple-900', 'to-slate-900',
      'from-emerald-950', 'via-green-900', 'to-emerald-950',
      'from-amber-100', 'via-orange-100', 'to-amber-200',
      'from-gray-950', 'via-zinc-900', 'to-gray-950',
      'bg-gradient-to-br'
    ]
    
    body.classList.remove(...themeBgClasses)
    html.classList.remove('theme-default', 'theme-eye-care', 'theme-parchment', 'theme-night')
    html.classList.add(`theme-${theme}`)
    
    const themeBgMap: Record<string, string[]> = {
      default: ['bg-gradient-to-br', 'from-slate-900', 'via-purple-900', 'to-slate-900'],
      'eye-care': ['bg-gradient-to-br', 'from-emerald-950', 'via-green-900', 'to-emerald-950'],
      parchment: ['bg-gradient-to-br', 'from-amber-100', 'via-orange-100', 'to-amber-200'],
      night: ['bg-gradient-to-br', 'from-gray-950', 'via-zinc-900', 'to-gray-950']
    }
    
    const classes = themeBgMap[theme] || themeBgMap.default
    classes.forEach(cls => body.classList.add(cls))
  }

  const restoreTheme = () => {
    if (!process.client || !themeApplied.value) return
    
    const body = document.body
    const html = document.documentElement
    
    body.className = ''
    originalBodyClasses.value.forEach(cls => body.classList.add(cls))
    
    html.classList.remove('theme-default', 'theme-eye-care', 'theme-parchment', 'theme-night')
    originalHtmlClasses.value.forEach(cls => html.classList.add(cls))
    
    themeApplied.value = false
  }

  if (process.client) {
    checkSystemDark()
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        checkSystemDark()
        if (themeApplied.value) {
          applyThemeToBody()
        }
      })
    }
  }

  watch(isNightMode, () => {
    if (themeApplied.value) {
      applyThemeToBody()
    }
  })

  watch(() => settings.value.theme, () => {
    if (themeApplied.value) {
      applyThemeToBody()
    }
  })

  return {
    settings,
    fontFamilyMap,
    fontFamilyCss,
    pageWidthMap,
    themeStyles,
    isNightMode,
    isLightTheme,
    effectiveTheme,
    themeApplied,
    updateSettings,
    resetSettings,
    applyThemeToBody,
    restoreTheme
  }
}
