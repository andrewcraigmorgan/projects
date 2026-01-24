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
              class="w-full transform overflow-hidden bg-white dark:bg-gray-800 shadow-xl transition-all flex flex-col"
              :class="[
                sizeClasses,
                isMobile ? 'rounded-t-2xl max-h-[90vh]' : 'rounded-none max-h-[85vh]'
              ]"
            >
              <!-- Header -->
              <div
                v-if="title || isMobile"
                class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0"
              >
                <!-- Mobile drag handle indicator -->
                <div v-if="isMobile" class="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />

                <h3 v-if="title" class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {{ title }}
                </h3>
                <div v-else />

                <!-- Close button (always visible on mobile, optional on desktop) -->
                <button
                  class="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  :class="isMobile ? '' : 'hidden sm:block'"
                  aria-label="Close"
                  @click="emit('close')"
                >
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Content -->
              <div class="px-4 sm:px-6 py-4 overflow-y-auto flex-1">
                <slot />
              </div>

              <!-- Footer -->
              <div
                v-if="$slots.footer"
                class="border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-900 flex-shrink-0"
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
