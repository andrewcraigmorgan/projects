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
    primary: 'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/50 dark:to-primary-800/50 text-primary-600 dark:text-primary-400',
    green: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/50 dark:to-green-800/50 text-green-600 dark:text-green-400',
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/50 dark:to-blue-800/50 text-blue-600 dark:text-blue-400',
    orange: 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/50 dark:to-orange-800/50 text-orange-600 dark:text-orange-400',
    purple: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/50 dark:to-purple-800/50 text-purple-600 dark:text-purple-400',
  }
  return colors[props.color]
})
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 shadow-soft p-6 hover:shadow-md transition-shadow duration-200">
    <div class="flex items-center">
      <div
        class="h-12 w-12 rounded-xl flex items-center justify-center"
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
        <p class="text-xl font-bold text-gray-900 dark:text-gray-100">
          {{ value }}
        </p>
      </div>
    </div>
  </div>
</template>
