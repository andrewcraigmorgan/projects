/**
 * Reactive breakpoint detection based on window size
 * Uses Tailwind CSS breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
 */
export function useBreakpoints() {
  const width = ref(0)

  const breakpoints = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  }

  const isMobile = computed(() => width.value < breakpoints.lg)
  const isTablet = computed(() => width.value >= breakpoints.md && width.value < breakpoints.lg)
  const isDesktop = computed(() => width.value >= breakpoints.lg)
  const isSmall = computed(() => width.value < breakpoints.sm)

  function updateWidth() {
    width.value = window.innerWidth
  }

  onMounted(() => {
    updateWidth()
    window.addEventListener('resize', updateWidth)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateWidth)
  })

  return {
    width,
    isMobile,
    isTablet,
    isDesktop,
    isSmall,
    breakpoints,
  }
}
