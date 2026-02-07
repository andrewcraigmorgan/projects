<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg'
  center?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  center: true,
})

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }
  return sizes[props.size]
})

const gradientId = useId()
</script>

<template>
  <div :class="{ 'text-center py-8': center }" role="status" aria-label="Loading">
    <svg
      class="animate-spin"
      :class="[sizeClasses, { 'mx-auto': center }]"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <defs>
        <linearGradient :id="gradientId" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6366f1" />
          <stop offset="50%" stop-color="#06b6d4" />
          <stop offset="100%" stop-color="#d946ef" />
        </linearGradient>
      </defs>
      <circle
        class="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        :stroke="`url(#${gradientId})`"
        stroke-width="4"
        stroke-linecap="round"
        d="M4 12a8 8 0 018-8"
      />
    </svg>
  </div>
</template>
