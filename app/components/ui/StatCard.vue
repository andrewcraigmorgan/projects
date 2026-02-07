<script setup lang="ts">
interface Props {
  label: string
  value: string | number
  color?: 'primary' | 'green' | 'blue' | 'orange' | 'purple' | 'accent'
}

const props = withDefaults(defineProps<Props>(), {
  color: 'primary',
})

const colorClasses = computed(() => {
  const colors = {
    primary: 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30',
    accent: 'bg-gradient-to-br from-accent-500 to-accent-600 text-white shadow-lg shadow-accent-500/30',
    green: 'bg-gradient-to-br from-success-500 to-success-600 text-white shadow-lg shadow-success-500/30',
    blue: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30',
    orange: 'bg-gradient-to-br from-warning-500 to-warning-600 text-white shadow-lg shadow-warning-500/30',
    purple: 'bg-gradient-to-br from-highlight-500 to-highlight-600 text-white shadow-lg shadow-highlight-500/30',
  }
  return colors[props.color]
})
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-soft p-6 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200">
    <div class="flex items-center">
      <div
        class="h-14 w-14 rounded-2xl flex items-center justify-center"
        :class="colorClasses"
      >
        <slot name="icon">
          <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </slot>
      </div>
      <div class="ml-5">
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ label }}</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {{ value }}
        </p>
      </div>
    </div>
  </div>
</template>
