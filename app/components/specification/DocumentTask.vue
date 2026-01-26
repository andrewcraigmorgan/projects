<script setup lang="ts">
import type { SpecificationTask } from '~/composables/useSpecification'

interface Props {
  task: SpecificationTask
  depth: number
}

const props = defineProps<Props>()

const priorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}
</script>

<template>
  <div
    class="border-l-2 border-primary-300 dark:border-primary-700 pl-4"
    :style="{ marginLeft: `${depth * 24}px` }"
  >
    <!-- Task Header -->
    <div class="flex items-start gap-3">
      <!-- Task number bullet -->
      <div class="mt-1 flex-shrink-0">
        <span class="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/30 rounded-full">
          {{ task.taskNumber }}
        </span>
      </div>

      <div class="flex-1 min-w-0">
        <!-- Title -->
        <h4 class="font-medium text-gray-900 dark:text-gray-100">{{ task.title }}</h4>

        <!-- Priority badge (scope-relevant, not status) -->
        <div v-if="task.priority && task.priority !== 'medium'" class="mt-1">
          <span
            class="px-2 py-0.5 text-xs font-medium"
            :class="{
              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300': task.priority === 'urgent' || task.priority === 'high',
              'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400': task.priority === 'low',
            }"
          >
            {{ priorityLabels[task.priority] || task.priority }} Priority
          </span>
        </div>

        <!-- Description - the main content for specification -->
        <div
          v-if="task.description"
          class="mt-3 prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
          v-html="task.description"
        />
        <p v-else class="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
          No description provided.
        </p>
      </div>
    </div>

    <!-- Subtasks -->
    <div v-if="task.subtasks && task.subtasks.length > 0" class="mt-4 space-y-4">
      <SpecificationDocumentTask
        v-for="subtask in task.subtasks"
        :key="subtask.id"
        :task="subtask"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>
