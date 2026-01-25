<script setup lang="ts">
import type { Task } from '~/composables/useTasks'

interface Props {
  tasks: Task[]
  loading?: boolean
  projectId?: string
  projectCode?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  projectId: '',
  projectCode: '',
})

const emit = defineEmits<{
  (e: 'select', task: Task): void
  (e: 'update-status', task: Task, status: Task['status']): void
  (e: 'task-created'): void
}>()

const { isMobile } = useBreakpoints()

const columns: { id: Task['status']; title: string; color: string }[] = [
  { id: 'todo', title: 'To Do', color: 'bg-blue-400' },
  { id: 'awaiting_approval', title: 'Awaiting Approval', color: 'bg-orange-400' },
  { id: 'open', title: 'Open', color: 'bg-green-400' },
  { id: 'in_review', title: 'In Review', color: 'bg-yellow-400' },
  { id: 'done', title: 'Done', color: 'bg-gray-400' },
]

// Mobile expanded columns state
const expandedColumns = ref<Set<Task['status']>>(new Set(['todo', 'open']))

function toggleColumn(columnId: Task['status']) {
  if (expandedColumns.value.has(columnId)) {
    expandedColumns.value.delete(columnId)
  } else {
    expandedColumns.value.add(columnId)
  }
  // Trigger reactivity
  expandedColumns.value = new Set(expandedColumns.value)
}

const tasksByStatus = computed(() => {
  const grouped: Record<Task['status'], Task[]> = {
    todo: [],
    awaiting_approval: [],
    open: [],
    in_review: [],
    done: [],
  }

  // Tasks are already filtered to root only by the API, no need to check parentTask
  for (const task of props.tasks) {
    if (grouped[task.status]) {
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
  <!-- Desktop: Horizontal scrolling columns -->
  <div class="hidden lg:flex gap-4 h-full overflow-x-auto pb-4">
    <div
      v-for="column in columns"
      :key="column.id"
      class="flex-shrink-0 w-72"
    >
      <!-- Column Header -->
      <div class="flex items-center gap-2 mb-3">
        <div class="h-3 w-3" :class="column.color" />
        <h3 class="font-medium text-gray-900 dark:text-gray-100">{{ column.title }}</h3>
        <span class="text-sm text-gray-500 dark:text-gray-400">
          {{ tasksByStatus[column.id].length }}
        </span>
      </div>

      <!-- Column Content -->
      <div
        class="bg-gray-100 dark:bg-gray-800 p-2 min-h-[200px] transition-colors"
        :class="{ 'bg-primary-50 dark:bg-primary-900/30 ring-2 ring-primary-300': dragOverColumn === column.id }"
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
            class="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-3 cursor-pointer hover:shadow-sm transition-all"
            :class="{ 'opacity-50': draggedTask?.id === task.id }"
            @dragstart="onDragStart($event, task)"
            @click="emit('select', task)"
          >
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-1">
                {{ projectCode || task.id.slice(0, 3).toUpperCase() }}-T{{ task.taskNumber ?? 0 }}
              </span>
            </div>
            <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              {{ task.title }}
            </h4>

            <div class="flex items-center gap-2">
              <span
                v-if="task.priority"
                class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium"
                :class="{
                  'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300': task.priority === 'low',
                  'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300': task.priority === 'medium',
                  'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300': task.priority === 'high',
                }"
              >
                {{ task.priority }}
              </span>
              <span
                v-else
                class="inline-flex items-center px-1.5 py-0.5 text-xs text-gray-400 dark:text-gray-500"
              >
                No priority
              </span>

              <span
                v-if="task.subtaskCount > 0"
                class="text-xs text-gray-500 dark:text-gray-400"
              >
                {{ task.subtaskCount }} subtask{{ task.subtaskCount !== 1 ? 's' : '' }}
              </span>
            </div>

            <div
              v-if="task.assignee"
              class="mt-2 flex items-center gap-1"
            >
              <div
                class="h-5 w-5 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-medium text-primary-700 dark:text-primary-300"
              >
                {{ task.assignee.name[0]?.toUpperCase() }}
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ task.assignee.name }}</span>
            </div>
          </div>

          <div
            v-if="tasksByStatus[column.id].length === 0"
            class="text-center py-8 text-gray-400 dark:text-gray-500 text-sm"
          >
            No tasks
          </div>

          <!-- Inline quick add at bottom of column -->
          <div v-if="projectId" class="mt-2">
            <TasksTaskQuickAdd
              :project-id="projectId"
              :status="column.id"
              :placeholder="`Add to ${column.title}...`"
              @created="emit('task-created')"
            />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Mobile: Stacked collapsible columns -->
  <div class="lg:hidden space-y-3">
    <div v-if="loading" class="text-center py-8">
      <svg
        class="animate-spin h-8 w-8 mx-auto text-gray-400"
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

    <template v-else>
      <div
        v-for="column in columns"
        :key="column.id"
        class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <!-- Collapsible Header -->
        <button
          class="w-full flex items-center justify-between p-4 min-h-[52px] hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          @click="toggleColumn(column.id)"
        >
          <div class="flex items-center gap-3">
            <div class="h-3 w-3 flex-shrink-0" :class="column.color" />
            <h3 class="font-medium text-gray-900 dark:text-gray-100">{{ column.title }}</h3>
            <span class="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {{ tasksByStatus[column.id].length }}
            </span>
          </div>
          <svg
            class="h-5 w-5 text-gray-400 transition-transform duration-200"
            :class="{ 'rotate-180': expandedColumns.has(column.id) }"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Collapsible Content -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="max-h-0 opacity-0"
          enter-to-class="max-h-[2000px] opacity-100"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="max-h-[2000px] opacity-100"
          leave-to-class="max-h-0 opacity-0"
        >
          <div
            v-if="expandedColumns.has(column.id)"
            class="border-t border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div class="p-3 space-y-2 bg-gray-50 dark:bg-gray-900">
              <div
                v-for="task in tasksByStatus[column.id]"
                :key="task.id"
                class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 cursor-pointer active:bg-gray-50 dark:active:bg-gray-700 transition-colors"
                @click="emit('select', task)"
              >
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5">
                    {{ projectCode || task.id.slice(0, 3).toUpperCase() }}-T{{ task.taskNumber ?? 0 }}
                  </span>
                </div>
                <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {{ task.title }}
                </h4>

                <div class="flex items-center gap-2 flex-wrap">
                  <span
                    v-if="task.priority"
                    class="inline-flex items-center px-2 py-1 text-xs font-medium"
                    :class="{
                      'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300': task.priority === 'low',
                      'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300': task.priority === 'medium',
                      'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300': task.priority === 'high',
                    }"
                  >
                    {{ task.priority }}
                  </span>

                  <span
                    v-if="task.subtaskCount > 0"
                    class="text-xs text-gray-500 dark:text-gray-400"
                  >
                    {{ task.subtaskCount }} subtask{{ task.subtaskCount !== 1 ? 's' : '' }}
                  </span>

                  <div
                    v-if="task.assignee"
                    class="flex items-center gap-1 ml-auto"
                  >
                    <div
                      class="h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-medium text-primary-700 dark:text-primary-300"
                    >
                      {{ task.assignee.name[0]?.toUpperCase() }}
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-if="tasksByStatus[column.id].length === 0"
                class="text-center py-6 text-gray-400 dark:text-gray-500 text-sm"
              >
                No tasks
              </div>

              <!-- Quick add on mobile -->
              <div v-if="projectId">
                <TasksTaskQuickAdd
                  :project-id="projectId"
                  :status="column.id"
                  :placeholder="`Add to ${column.title}...`"
                  @created="emit('task-created')"
                />
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </template>
  </div>
</template>
