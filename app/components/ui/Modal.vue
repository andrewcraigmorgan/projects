<script setup lang="ts">
interface Props {
  open: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { isMobile } = useBreakpoints()

// Generate unique IDs for ARIA
const titleId = useId()
const contentId = useId()

// Focus trap refs
const modalRef = ref<HTMLElement | null>(null)
const previouslyFocusedElement = ref<HTMLElement | null>(null)

// Handle keyboard events
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}

// Focus management
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    // Store the currently focused element
    previouslyFocusedElement.value = document.activeElement as HTMLElement
    // Focus the modal after it opens
    nextTick(() => {
      modalRef.value?.focus()
    })
    // Add keyboard listener
    document.addEventListener('keydown', handleKeydown)
  } else {
    // Restore focus to previously focused element
    previouslyFocusedElement.value?.focus()
    // Remove keyboard listener
    document.removeEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

const sizeClasses = computed(() => {
  if (isMobile.value) {
    // On mobile, always use full width bottom sheet
    return 'w-full max-w-full'
  }

  switch (props.size) {
    case 'sm':
      return 'max-w-sm'
    case 'md':
      return 'max-w-md'
    case 'lg':
      return 'max-w-lg'
    case 'xl':
      return 'max-w-xl'
    case 'full':
      return 'max-w-4xl'
    default:
      return 'max-w-md'
  }
})

function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 overflow-y-auto"
      >
        <div
          class="flex min-h-full bg-black/50"
          :class="isMobile ? 'items-end' : 'items-center justify-center p-4'"
          @click="handleBackdropClick"
        >
          <Transition
            :enter-active-class="isMobile ? 'duration-300 ease-out' : 'duration-200 ease-out'"
            :enter-from-class="isMobile ? 'translate-y-full' : 'opacity-0 scale-95'"
            :enter-to-class="isMobile ? 'translate-y-0' : 'opacity-100 scale-100'"
            :leave-active-class="isMobile ? 'duration-200 ease-in' : 'duration-150 ease-in'"
            :leave-from-class="isMobile ? 'translate-y-0' : 'opacity-100 scale-100'"
            :leave-to-class="isMobile ? 'translate-y-full' : 'opacity-0 scale-95'"
          >
            <div
              v-if="open"
              ref="modalRef"
              role="dialog"
              aria-modal="true"
              :aria-labelledby="title ? titleId : undefined"
              :aria-describedby="contentId"
              tabindex="-1"
              class="w-full transform overflow-hidden bg-white dark:bg-gray-800 shadow-2xl transition-all flex flex-col border border-gray-200/60 dark:border-gray-700/60 focus:outline-none"
              :class="[
                sizeClasses,
                isMobile ? 'rounded-t-2xl max-h-[90vh]' : 'rounded-2xl max-h-[85vh]'
              ]"
            >
              <!-- Header -->
              <div
                v-if="title || isMobile"
                class="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0 bg-gray-50/50 dark:bg-gray-800/50"
              >
                <!-- Mobile drag handle indicator -->
                <div v-if="isMobile" class="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />

                <h3 v-if="title" :id="titleId" class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {{ title }}
                </h3>
                <div v-else />

                <!-- Close button (always visible on mobile, optional on desktop) -->
                <button
                  class="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                  :class="isMobile ? '' : 'hidden sm:block'"
                  aria-label="Close dialog"
                  @click="emit('close')"
                >
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Content -->
              <div :id="contentId" class="px-4 sm:px-6 py-4 overflow-y-auto flex-1">
                <slot />
              </div>

              <!-- Footer -->
              <div
                v-if="$slots.footer"
                class="border-t border-gray-100 dark:border-gray-700/60 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50/50 dark:bg-gray-900/50 flex-shrink-0"
              >
                <slot name="footer" />
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
