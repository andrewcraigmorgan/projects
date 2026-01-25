<script setup lang="ts">
interface Props {
  icon?: string
  title: string
  description?: string
}

defineProps<Props>()
</script>

<template>
  <div class="text-center py-12 px-6">
    <div class="h-16 w-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mx-auto mb-5 shadow-soft">
      <slot name="icon">
        <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </slot>
    </div>
    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ title }}</h3>
    <p v-if="description" class="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">{{ description }}</p>
    <div v-if="$slots.actions" class="flex items-center justify-center gap-3">
      <slot name="actions" />
    </div>
  </div>
</template>
