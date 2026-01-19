<script setup lang="ts">
interface ImportResults {
  projects: { created: number; errors: string[] }
  tasks: { created: number; errors: string[] }
  milestones?: { created: number; errors: string[] }
  tags?: { created: number; errors: string[] }
}

interface Props {
  results: ImportResults | null
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'reset'): void
}>()

const allErrors = computed(() => {
  if (!props.results) return []
  return [
    ...(props.results.projects?.errors || []),
    ...(props.results.tasks?.errors || []),
    ...(props.results.milestones?.errors || []),
    ...(props.results.tags?.errors || []),
  ].slice(0, 10)
})

const props = defineProps<Props>()
</script>

<template>
  <UiCard>
    <div class="text-center mb-6">
      <svg class="h-16 w-16 mx-auto text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">
        Import Complete!
      </h2>
    </div>

    <div v-if="results" class="space-y-4">
      <div class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
        <p class="text-green-700 dark:text-green-300">
          <strong>{{ results.projects.created }}</strong> projects created
        </p>
        <p class="text-green-700 dark:text-green-300">
          <strong>{{ results.tasks.created }}</strong> tasks created
        </p>
        <p v-if="results.milestones?.created" class="text-green-700 dark:text-green-300">
          <strong>{{ results.milestones.created }}</strong> milestones created
        </p>
        <p v-if="results.tags?.created" class="text-green-700 dark:text-green-300">
          <strong>{{ results.tags.created }}</strong> tags created
        </p>
      </div>

      <div
        v-if="allErrors.length > 0"
        class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
      >
        <p class="text-yellow-700 dark:text-yellow-300 font-medium mb-2">Some items had issues:</p>
        <ul class="text-sm text-yellow-600 dark:text-yellow-400 list-disc list-inside">
          <li v-for="(err, idx) in allErrors" :key="idx">
            {{ err }}
          </li>
        </ul>
      </div>
    </div>

    <div class="mt-6 flex justify-center gap-4">
      <UiButton variant="ghost" @click="emit('reset')">
        Import More
      </UiButton>
      <NuxtLink to="/projects">
        <UiButton>
          View Projects
        </UiButton>
      </NuxtLink>
    </div>
  </UiCard>
</template>
