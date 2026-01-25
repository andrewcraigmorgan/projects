<script setup lang="ts">
interface Props {
  title?: string
  backLink?: string
  backLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  backLabel: 'Back',
})

const { toggle, isMobile } = useSidebar()
</script>

<template>
  <header class="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200/60 dark:border-gray-700/60 sticky top-0 z-10">
    <div class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
      <div class="flex items-center gap-3 sm:gap-4 min-w-0">
        <!-- Mobile menu button -->
        <button
          v-if="isMobile"
          class="lg:hidden p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
          aria-label="Open menu"
          @click="toggle"
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <NuxtLink
          v-if="backLink"
          :to="backLink"
          class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </NuxtLink>
        <div class="min-w-0">
          <h1 v-if="title" class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
            {{ title }}
          </h1>
          <slot name="title" />
        </div>
      </div>
      <div class="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
