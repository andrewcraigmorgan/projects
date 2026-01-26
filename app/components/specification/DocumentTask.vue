<script setup lang="ts">
import type { SpecificationTask } from '~/composables/useSpecification'

interface Props {
  task: SpecificationTask
  depth: number
}

const props = defineProps<Props>()
const route = useRoute()

const projectId = computed(() => route.params.id as string)

const priorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

const statusLabels: Record<string, string> = {
  todo: 'To Do',
  open: 'Open',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Complete',
  awaiting_approval: 'Awaiting Approval',
}

// Typography classes based on depth
const titleClasses = computed(() => {
  switch (props.depth) {
    case 0:
      return 'text-lg font-semibold text-gray-900 dark:text-gray-100'
    case 1:
      return 'text-base font-semibold text-gray-800 dark:text-gray-200'
    case 2:
      return 'text-sm font-medium text-gray-700 dark:text-gray-300'
    default:
      return 'text-sm font-normal text-gray-600 dark:text-gray-400'
  }
})

const numberClasses = computed(() => {
  switch (props.depth) {
    case 0:
      return 'text-lg font-semibold text-primary-600 dark:text-primary-400'
    case 1:
      return 'text-base font-semibold text-primary-500 dark:text-primary-400'
    case 2:
      return 'text-sm font-medium text-primary-500 dark:text-primary-400'
    default:
      return 'text-sm text-gray-500 dark:text-gray-400'
  }
})

const containerClasses = computed(() => {
  switch (props.depth) {
    case 0:
      return 'pb-6 border-b border-gray-200 dark:border-gray-700'
    case 1:
      return 'pb-4'
    default:
      return 'pb-2'
  }
})

const taskUrl = computed(() => `/projects/${projectId.value}/tasks/${props.task.id}`)
</script>

<template>
  <div :class="containerClasses" class="group relative">
    <!-- Task Header -->
    <div class="flex items-baseline gap-2">
      <span :class="numberClasses">{{ task.taskNumber }}.</span>
      <span :class="titleClasses">{{ task.title }}</span>

      <!-- Hover actions -->
      <span
        class="opacity-0 group-hover:opacity-100 transition-opacity duration-150 ml-2 flex items-center gap-2"
      >
        <span class="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
          {{ statusLabels[task.status] || task.status }}
          <template v-if="task.priority && task.priority !== 'medium'">
            &middot; {{ priorityLabels[task.priority] || task.priority }}
          </template>
        </span>
        <NuxtLink
          :to="taskUrl"
          class="px-2 py-0.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
        >
          Edit
        </NuxtLink>
      </span>
    </div>

    <!-- Description - the main content for specification -->
    <div
      v-if="task.description"
      class="task-description mt-2 prose prose-sm prose-gray dark:prose-invert max-w-none"
      v-html="task.description"
    />
    <p v-else class="mt-1 text-sm text-gray-400 dark:text-gray-500 italic">
      No description provided.
    </p>

    <!-- Subtasks -->
    <div v-if="task.subtasks && task.subtasks.length > 0" class="mt-4 space-y-3">
      <SpecificationDocumentTask
        v-for="subtask in task.subtasks"
        :key="subtask.id"
        :task="subtask"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>

<style scoped>
.task-description :deep(p) {
  margin-bottom: 0.75em;
  color: rgb(31 41 55); /* gray-800 for better readability */
}

.task-description :deep(p:last-child) {
  margin-bottom: 0;
}

.task-description :deep(ul) {
  list-style-type: disc;
  padding-left: 1.5em;
  margin-bottom: 0.75em;
}

.task-description :deep(ol) {
  list-style-type: decimal;
  padding-left: 1.5em;
  margin-bottom: 0.75em;
}

.task-description :deep(li) {
  margin-bottom: 0.25em;
  color: rgb(31 41 55); /* gray-800 for better readability */
}

.task-description :deep(strong) {
  font-weight: 600;
}

:global(.dark) .task-description :deep(p),
:global(.dark) .task-description :deep(li) {
  color: rgb(243 244 246); /* gray-100 for good contrast in dark mode */
}
</style>
