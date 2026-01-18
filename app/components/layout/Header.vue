<script setup lang="ts">
interface Props {
  title?: string
}

defineProps<Props>()
</script>

<template>
  <header class="bg-white border-b border-gray-200">
    <div class="flex items-center justify-between px-6 py-4">
      <div>
        <h1 v-if="title" class="text-2xl font-semibold text-gray-900">
          {{ title }}
        </h1>
        <slot name="title" />
      </div>
      <div class="flex items-center space-x-4">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
