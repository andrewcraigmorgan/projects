<script setup lang="ts">
interface Props {
  title?: string
  backLink?: string
  backLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  backLabel: 'Back',
})
</script>

<template>
  <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between px-6 py-4">
      <div class="flex items-center gap-4">
        <NuxtLink
          v-if="props.backLink"
          :to="props.backLink"
          class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </NuxtLink>
        <div>
          <h1 v-if="title" class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {{ title }}
          </h1>
          <slot name="title" />
        </div>
      </div>
      <div class="flex items-center space-x-4">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
