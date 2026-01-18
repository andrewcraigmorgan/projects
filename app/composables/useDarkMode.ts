export function useDarkMode() {
  const colorMode = useState<'dark' | 'light' | 'system'>('colorMode', () => 'system')

  const isDark = computed(() => {
    if (colorMode.value === 'system') {
      if (import.meta.client) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      return true // Default to dark on server
    }
    return colorMode.value === 'dark'
  })

  function applyTheme() {
    if (!import.meta.client) return

    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function setColorMode(mode: 'dark' | 'light' | 'system') {
    colorMode.value = mode
    localStorage.setItem('colorMode', mode)
    applyTheme()
  }

  function init() {
    if (!import.meta.client) return

    // Load saved preference
    const saved = localStorage.getItem('colorMode') as 'dark' | 'light' | 'system' | null
    if (saved) {
      colorMode.value = saved
    }

    // Apply initial theme
    applyTheme()

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (colorMode.value === 'system') {
        applyTheme()
      }
    })
  }

  return {
    colorMode,
    isDark,
    setColorMode,
    init,
  }
}
