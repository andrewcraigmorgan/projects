<script setup lang="ts">
interface Props {
  title?: string
  padding?: boolean
  ariaLabel?: string // Optional aria-label for the card region
}

withDefaults(defineProps<Props>(), {
  padding: true,
})

const headingId = useId()
</script>

<template>
  <article
    class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 shadow-soft overflow-hidden"
    :aria-labelledby="title ? headingId : undefined"
    :aria-label="ariaLabel"
  >
    <div v-if="title || $slots.header" class="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50">
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
    <div v-if="$slots.footer" class="px-6 py-4 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/50">
      <slot name="footer" />
    </div>
  </article>
</template>
