<script setup lang="ts">
interface Props {
  name: string
  avatar?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  role?: 'team' | 'client'
  showRole?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showRole: false,
})

const sizeClasses = computed(() => {
  const sizes = {
    xs: 'h-5 w-5 text-xs',
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  }
  return sizes[props.size]
})

const colorClasses = computed(() => {
  if (props.role === 'client') {
    return 'bg-gradient-to-br from-warning-400 to-warning-600 text-white ring-2 ring-warning-200 dark:ring-warning-800'
  }
  return 'bg-gradient-to-br from-primary-400 to-primary-600 text-white ring-2 ring-primary-200 dark:ring-primary-800'
})

const initial = computed(() => props.name?.[0]?.toUpperCase() || '?')
</script>

<template>
  <div class="flex items-center gap-2">
    <div
      v-if="avatar"
      class="rounded-full bg-cover bg-center ring-2 ring-gray-200 dark:ring-gray-700"
      :class="sizeClasses"
      :style="{ backgroundImage: `url(${avatar})` }"
      role="img"
      :aria-label="`${name}${role ? ` (${role === 'client' ? 'Client' : 'Team'})` : ''}`"
      :title="name"
    />
    <div
      v-else
      class="rounded-full flex items-center justify-center font-semibold shadow-sm"
      :class="[sizeClasses, colorClasses]"
      role="img"
      :aria-label="`${name}${role ? ` (${role === 'client' ? 'Client' : 'Team'})` : ''}`"
      :title="name"
    >
      {{ initial }}
    </div>
    <slot>
      <span v-if="name" class="text-gray-900 dark:text-gray-100 font-medium">{{ name }}</span>
    </slot>
    <span
      v-if="showRole && role"
      class="text-xs px-1.5 py-0.5 rounded-md font-medium"
      :class="role === 'client'
        ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/50 dark:text-warning-300'
        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'"
    >
      {{ role === 'client' ? 'Client' : 'Team' }}
    </span>
  </div>
</template>
