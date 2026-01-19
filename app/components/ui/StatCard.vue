<script setup lang="ts">
interface Props {
  label: string
  value: string | number
  color?: 'primary' | 'green' | 'blue' | 'orange' | 'purple'
}

const props = withDefaults(defineProps<Props>(), {
  color: 'primary',
})

const colorClasses = computed(() => {
  const colors = {
    primary: 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400',
    green: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
    blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
    orange: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400',
    purple: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
  }
  return colors[props.color]
})
</script>

<template>
  <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
    <div class="flex items-center">
      <div
        class="h-12 w-12 flex items-center justify-center"
        :class="colorClasses"
      >
        <slot name="icon">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </slot>
      </div>
      <div class="ml-4">
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ label }}</p>
        <p class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {{ value }}
        </p>
      </div>
    </div>
  </div>
</template>
