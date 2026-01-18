<script setup lang="ts">
import type { Task } from '~/composables/useTasks'

interface Props {
  task: Task
  depth?: number
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
})

const emit = defineEmits<{
  (e: 'click', task: Task): void
  (e: 'toggle-expand', task: Task): void
}>()

const expanded = ref(false)

const priorityColors = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
}

const statusColors = {
  todo: 'bg-gray-400',
  in_progress: 'bg-blue-400',
  review: 'bg-yellow-400',
  done: 'bg-green-400',
}
</script>

<template>
  <div
    class="group bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
    :style="{ marginLeft: `${depth * 24}px` }"
    @click="emit('click', task)"
  >
    <div class="p-4">
      <div class="flex items-start gap-3">
        <!-- Expand button for subtasks -->
        <button
          v-if="task.subtaskCount > 0"
          class="mt-0.5 p-1 rounded hover:bg-gray-100 transition-colors"
          @click.stop="expanded = !expanded; emit('toggle-expand', task)"
        >
          <svg
            class="h-4 w-4 text-gray-500 transition-transform"
            :class="{ 'rotate-90': expanded }"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
        <div v-else class="w-6" />

        <!-- Status indicator -->
        <div
          class="mt-1.5 h-3 w-3 rounded-full flex-shrink-0"
          :class="statusColors[task.status]"
        />

        <div class="flex-1 min-w-0">
          <!-- Title -->
          <h4
            class="text-sm font-medium text-gray-900"
            :class="{ 'line-through text-gray-500': task.status === 'done' }"
          >
            {{ task.title }}
          </h4>

          <!-- Meta -->
          <div class="mt-1 flex items-center gap-2 flex-wrap">
            <span
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              :class="priorityColors[task.priority]"
            >
              {{ task.priority }}
            </span>

            <span
              v-if="task.dueDate"
              class="text-xs text-gray-500"
            >
              Due {{ new Date(task.dueDate).toLocaleDateString() }}
            </span>

            <span
              v-if="task.subtaskCount > 0"
              class="text-xs text-gray-500"
            >
              {{ task.subtaskCount }} subtask{{ task.subtaskCount !== 1 ? 's' : '' }}
            </span>
          </div>
        </div>

        <!-- Assignee -->
        <div
          v-if="task.assignee"
          class="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-700"
          :title="task.assignee.name"
        >
          {{ task.assignee.name[0]?.toUpperCase() }}
        </div>
      </div>
    </div>

    <!-- Subtasks slot -->
    <div v-if="expanded && task.subtasks?.length">
      <div class="border-t border-gray-100 px-4 py-2 bg-gray-50">
        <slot name="subtasks" :subtasks="task.subtasks" />
      </div>
    </div>
  </div>
</template>
