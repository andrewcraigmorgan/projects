/**
 * Manages sidebar open/close state with mobile-specific behavior
 */
export function useSidebar() {
  const isOpen = useState('sidebar-open', () => false)
  const { isMobile } = useBreakpoints()
  const route = useRoute()

  // Auto-close sidebar on route change when on mobile
  watch(
    () => route.fullPath,
    () => {
      if (isMobile.value && isOpen.value) {
        isOpen.value = false
      }
    }
  )

  // Close sidebar when switching from mobile to desktop
  watch(isMobile, (mobile) => {
    if (!mobile) {
      isOpen.value = false
    }
  })

  function open() {
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function toggle() {
    isOpen.value = !isOpen.value
  }

  return {
    isOpen,
    isMobile,
    open,
    close,
    toggle,
  }
}
