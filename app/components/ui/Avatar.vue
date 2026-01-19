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
    return 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
  }
  return 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
})

const initial = computed(() => props.name?.[0]?.toUpperCase() || '?')
</script>

<template>
  <div class="flex items-center gap-2">
    <div
      v-if="avatar"
      class="rounded-full bg-cover bg-center"
      :class="sizeClasses"
      :style="{ backgroundImage: `url(${avatar})` }"
    />
    <div
      v-else
      class="rounded-full flex items-center justify-center font-medium"
      :class="[sizeClasses, colorClasses]"
    >
      {{ initial }}
    </div>
    <slot>
      <span v-if="name" class="text-gray-900 dark:text-gray-100">{{ name }}</span>
    </slot>
    <span
      v-if="showRole && role"
      class="text-xs px-1 py-0.5"
      :class="role === 'client'
        ? 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300'
        : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'"
    >
      {{ role === 'client' ? 'Client' : 'Team' }}
    </span>
  </div>
</template>
