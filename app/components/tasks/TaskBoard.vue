<script setup lang="ts">
import type { Task } from '~/composables/useTasks'

interface Props {
  tasks: Task[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  (e: 'select', task: Task): void
  (e: 'update-status', task: Task, status: Task['status']): void
}>()

const columns: { id: Task['status']; title: string; color: string }[] = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-400' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-400' },
  { id: 'review', title: 'Review', color: 'bg-yellow-400' },
  { id: 'done', title: 'Done', color: 'bg-green-400' },
]

const tasksByStatus = computed(() => {
  const grouped: Record<Task['status'], Task[]> = {
    todo: [],
    in_progress: [],
    review: [],
    done: [],
  }

  for (const task of props.tasks) {
    if (!task.parentTask) {
      grouped[task.status].push(task)
    }
  }

  return grouped
})

// Drag and drop
const draggedTask = ref<Task | null>(null)
const dragOverColumn = ref<Task['status'] | null>(null)

function onDragStart(event: DragEvent, task: Task) {
  draggedTask.value = task
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', task.id)
  }
}

function onDragOver(event: DragEvent, status: Task['status']) {
  event.preventDefault()
  dragOverColumn.value = status
}

function onDragLeave() {
  dragOverColumn.value = null
}

function onDrop(event: DragEvent, status: Task['status']) {
  event.preventDefault()
  dragOverColumn.value = null

  if (draggedTask.value && draggedTask.value.status !== status) {
    emit('update-status', draggedTask.value, status)
  }

  draggedTask.value = null
}
</script>

<template>
  <div class="flex gap-4 h-full overflow-x-auto pb-4">
    <div
      v-for="column in columns"
      :key="column.id"
      class="flex-shrink-0 w-72"
    >
      <!-- Column Header -->
      <div class="flex items-center gap-2 mb-3">
        <div class="h-3 w-3 rounded-full" :class="column.color" />
        <h3 class="font-medium text-gray-900">{{ column.title }}</h3>
        <span class="text-sm text-gray-500">
          {{ tasksByStatus[column.id].length }}
        </span>
      </div>

      <!-- Column Content -->
      <div
        class="bg-gray-100 rounded-lg p-2 min-h-[200px] transition-colors"
        :class="{ 'bg-primary-50 ring-2 ring-primary-300': dragOverColumn === column.id }"
        @dragover="onDragOver($event, column.id)"
        @dragleave="onDragLeave"
        @drop="onDrop($event, column.id)"
      >
        <div v-if="loading" class="text-center py-4">
          <svg
            class="animate-spin h-6 w-6 mx-auto text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="task in tasksByStatus[column.id]"
            :key="task.id"
            draggable="true"
            class="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-sm transition-all"
            :class="{ 'opacity-50': draggedTask?.id === task.id }"
            @dragstart="onDragStart($event, task)"
            @click="emit('select', task)"
          >
            <h4 class="text-sm font-medium text-gray-900 mb-1">
              {{ task.title }}
            </h4>

            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                :class="{
                  'bg-gray-100 text-gray-600': task.priority === 'low',
                  'bg-blue-100 text-blue-600': task.priority === 'medium',
                  'bg-orange-100 text-orange-600': task.priority === 'high',
                  'bg-red-100 text-red-600': task.priority === 'urgent',
                }"
              >
                {{ task.priority }}
              </span>

              <span
                v-if="task.subtaskCount > 0"
                class="text-xs text-gray-500"
              >
                {{ task.subtaskCount }} subtask{{ task.subtaskCount !== 1 ? 's' : '' }}
              </span>
            </div>

            <div
              v-if="task.assignee"
              class="mt-2 flex items-center gap-1"
            >
              <div
                class="h-5 w-5 rounded-full bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-700"
              >
                {{ task.assignee.name[0]?.toUpperCase() }}
              </div>
              <span class="text-xs text-gray-500">{{ task.assignee.name }}</span>
            </div>
          </div>

          <div
            v-if="tasksByStatus[column.id].length === 0"
            class="text-center py-8 text-gray-400 text-sm"
          >
            No tasks
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
