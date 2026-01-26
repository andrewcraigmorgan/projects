<script setup lang="ts">
import type { SpecificationTask } from '~/composables/useSpecification'

interface Props {
  task: SpecificationTask
  depth: number
}

const props = defineProps<Props>()

// State for subtask expansion
const showSubtasks = ref(true)

const statusColors: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  review: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  awaiting_approval: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}

const priorityColors: Record<string, string> = {
  low: 'text-green-600 dark:text-green-400',
  medium: 'text-amber-600 dark:text-amber-400',
  high: 'text-red-600 dark:text-red-400',
  urgent: 'text-red-700 dark:text-red-300 font-semibold',
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString()
}

function stripHtml(html: string) {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

const truncatedDescription = computed(() => {
  if (!props.task.description) return ''
  const plain = stripHtml(props.task.description)
  return plain.length > 150 ? plain.substring(0, 150) + '...' : plain
})
</script>

<template>
  <div>
    <div
      class="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50"
      :style="{ paddingLeft: `${16 + depth * 24}px` }"
    >
      <div class="flex items-start gap-3">
        <!-- Checkbox icon -->
        <div class="mt-0.5">
          <svg
            v-if="task.status === 'done'"
            class="w-5 h-5 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg
            v-else
            class="w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <!-- Task content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <!-- Task number -->
            <span class="text-sm text-gray-500 dark:text-gray-400 font-mono">
              #{{ task.taskNumber }}
            </span>

            <!-- Title -->
            <span class="font-medium text-gray-900 dark:text-gray-100">
              {{ task.title }}
            </span>

            <!-- Subtask toggle -->
            <button
              v-if="task.subtasks && task.subtasks.length > 0"
              class="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              @click="showSubtasks = !showSubtasks"
            >
              {{ showSubtasks ? 'Hide' : 'Show' }} {{ task.subtasks.length }} subtask{{ task.subtasks.length === 1 ? '' : 's' }}
            </button>
          </div>

          <!-- Description -->
          <p
            v-if="truncatedDescription"
            class="text-sm text-gray-500 dark:text-gray-400 mt-1"
          >
            {{ truncatedDescription }}
          </p>

          <!-- Meta line -->
          <div class="flex items-center gap-3 mt-2 flex-wrap">
            <!-- Status badge -->
            <span
              class="inline-flex items-center px-2 py-0.5 text-xs font-medium"
              :class="statusColors[task.status] || statusColors.todo"
            >
              {{ task.status.replace('_', ' ') }}
            </span>

            <!-- Priority -->
            <span
              v-if="task.priority"
              class="text-xs"
              :class="priorityColors[task.priority] || ''"
            >
              {{ task.priority }} priority
            </span>

            <!-- Due date -->
            <span
              v-if="task.dueDate"
              class="text-xs text-gray-500 dark:text-gray-400"
            >
              Due: {{ formatDate(task.dueDate) }}
            </span>

            <!-- Assignees -->
            <div v-if="task.assignees && task.assignees.length > 0" class="flex items-center gap-1">
              <span class="text-xs text-gray-500 dark:text-gray-400">Assigned:</span>
              <span
                v-for="(assignee, i) in task.assignees"
                :key="assignee.id"
                class="text-xs text-gray-700 dark:text-gray-300"
              >
                {{ assignee.name }}{{ i < task.assignees.length - 1 ? ',' : '' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Subtasks -->
    <div v-if="showSubtasks && task.subtasks && task.subtasks.length > 0">
      <SpecificationTaskRow
        v-for="subtask in task.subtasks"
        :key="subtask.id"
        :task="subtask"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>
