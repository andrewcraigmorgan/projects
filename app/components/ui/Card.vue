<script setup lang="ts">
interface Props {
  title?: string
  padding?: boolean
  ariaLabel?: string
  hover?: boolean
}

withDefaults(defineProps<Props>(), {
  padding: true,
  hover: false,
})

const headingId = useId()
</script>

<template>
  <article
    class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-soft overflow-hidden transition-all duration-200"
    :class="{ 'hover:shadow-elevated hover:-translate-y-0.5': hover }"
    :aria-labelledby="title ? headingId : undefined"
    :aria-label="ariaLabel"
  >
    <div
      v-if="title || $slots.header"
      class="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 bg-gradient-to-r from-gray-50/80 to-gray-50/40 dark:from-gray-800/80 dark:to-gray-800/40"
    >
      <slot name="header">
        <div class="flex items-center justify-between">
          <h3 :id="headingId" class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ title }}</h3>
          <slot name="actions" />
        </div>
      </slot>
    </div>
    <div :class="{ 'p-6': padding }">
      <slot />
    </div>
    <div v-if="$slots.footer" class="px-6 py-4 border-t border-gray-100 dark:border-gray-700/60 bg-gradient-to-r from-gray-50/80 to-gray-50/40 dark:from-gray-900/80 dark:to-gray-900/40">
      <slot name="footer" />
    </div>
  </article>
</template>
