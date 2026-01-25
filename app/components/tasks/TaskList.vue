<script setup lang="ts">
import type { Task } from '~/composables/useTasks'

interface Props {
  tasks: Task[]
  loading?: boolean
  depth?: number
  projectId?: string
  projectCode?: string
  enableDragDrop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  depth: 0,
  projectId: '',
  projectCode: '',
  enableDragDrop: true,
})

const emit = defineEmits<{
  (e: 'select', task: Task): void
  (e: 'load-subtasks', task: Task): void
  (e: 'task-created'): void
  (e: 'move-task', taskId: string, newParentTask: string | null, newOrder: number): void
  (e: 'context-menu', task: Task, event: MouseEvent): void
}>()

const expandedTasks = ref<Set<string>>(new Set())
const loadedSubtasks = ref<Map<string, Task[]>>(new Map())

// Drag-and-drop state
const draggedTask = ref<Task | null>(null)
const dropTarget = ref<{ taskId: string; position: 'above' | 'below' | 'inside' } | null>(null)

async function toggleExpand(task: Task) {
  if (expandedTasks.value.has(task.id)) {
    expandedTasks.value.delete(task.id)
  } else {
    expandedTasks.value.add(task.id)
    if (!loadedSubtasks.value.has(task.id)) {
      emit('load-subtasks', task)
    }
  }
}

// Drag-and-drop handlers
function handleDragStart(task: Task, event: DragEvent) {
  if (!props.enableDragDrop) return
  draggedTask.value = task
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', task.id)
  }
}

function handleDragEnd() {
  draggedTask.value = null
  dropTarget.value = null
}

function handleDragOver(task: Task, event: DragEvent) {
  if (!props.enableDragDrop || !draggedTask.value) return
  if (draggedTask.value.id === task.id) return

  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }

  // Determine drop position based on cursor location
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const y = event.clientY - rect.top
  const height = rect.height

  let position: 'above' | 'below' | 'inside'
  if (y < height * 0.25) {
    position = 'above'
  } else if (y > height * 0.75) {
    position = 'below'
  } else {
    position = 'inside'
  }

  dropTarget.value = { taskId: task.id, position }
}

function handleDragLeave() {
  dropTarget.value = null
}

function handleDrop(task: Task, event: DragEvent) {
  if (!props.enableDragDrop || !draggedTask.value) return
  if (draggedTask.value.id === task.id) return

  event.preventDefault()

  const position = dropTarget.value?.position || 'below'

  // Calculate new parent and order based on drop position
  let newParentTask: string | null
  let newOrder: number

  const taskIndex = props.tasks.findIndex(t => t.id === task.id)

  if (position === 'inside') {
    // Drop as child of target task
    newParentTask = task.id
    newOrder = 0 // Will be appended at the end by the backend
  } else if (position === 'above') {
    // Drop above target task (same parent)
    newParentTask = task.parentTask || null
    newOrder = task.order
  } else {
    // Drop below target task (same parent)
    newParentTask = task.parentTask || null
    newOrder = task.order + 1
  }

  emit('move-task', draggedTask.value.id, newParentTask, newOrder)

  draggedTask.value = null
  dropTarget.value = null
}

function handleRootDrop(event: DragEvent) {
  if (!props.enableDragDrop || !draggedTask.value) return
  event.preventDefault()

  // Move to root level at the end
  const maxOrder = props.tasks.reduce((max, t) => Math.max(max, t.order), -1)
  emit('move-task', draggedTask.value.id, null, maxOrder + 1)

  draggedTask.value = null
  dropTarget.value = null
}

function handleRootDragOver(event: DragEvent) {
  if (!props.enableDragDrop || !draggedTask.value) return
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function getDropIndicatorClass(taskId: string) {
  if (!dropTarget.value || dropTarget.value.taskId !== taskId) return ''

  switch (dropTarget.value.position) {
    case 'above':
      return 'ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 -translate-y-0.5'
    case 'below':
      return 'ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 translate-y-0.5'
    case 'inside':
      return 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
    default:
      return ''
  }
}

function handleContextMenu(task: Task, event: MouseEvent) {
  emit('context-menu', task, event)
}

defineExpose({
  setSubtasks(taskId: string, subtasks: Task[]) {
    loadedSubtasks.value.set(taskId, subtasks)
  },
})
</script>

<template>
  <div class="space-y-2">
    <div v-if="loading" class="text-center py-8" role="status" aria-label="Loading tasks">
      <svg
        class="animate-spin h-8 w-8 mx-auto text-primary-600"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
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
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>

    <template v-else-if="tasks.length === 0">
      <!-- Inline quick add when empty -->
      <div v-if="projectId && depth === 0">
        <TasksTaskQuickAdd
          :project-id="projectId"
          placeholder="Add your first task..."
          @created="emit('task-created')"
        />
      </div>
      <p v-else class="text-center py-8 text-gray-500">No tasks found</p>
    </template>

    <template v-else>
      <ul class="space-y-2" role="list" aria-label="Task list">
        <li
          v-for="task in tasks"
          :key="task.id"
          class="transition-transform duration-150 list-none"
          :class="getDropIndicatorClass(task.id)"
          @dragover="handleDragOver(task, $event)"
          @dragleave="handleDragLeave"
          @drop="handleDrop(task, $event)"
        >
        <TasksTaskCard
          :task="{ ...task, subtasks: loadedSubtasks.get(task.id) }"
          :depth="depth"
          :project-code="projectCode"
          @click="emit('select', $event)"
          @toggle-expand="toggleExpand"
          @dragstart="handleDragStart"
          @dragend="handleDragEnd"
          @context-menu="handleContextMenu"
        >
          <template #subtasks="{ subtasks }">
            <TaskList
              :tasks="subtasks"
              :depth="depth + 1"
              :project-code="projectCode"
              :enable-drag-drop="enableDragDrop"
              @select="emit('select', $event)"
              @load-subtasks="emit('load-subtasks', $event)"
              @move-task="(taskId, parent, order) => emit('move-task', taskId, parent, order)"
              @context-menu="(task, event) => emit('context-menu', task, event)"
            />
          </template>
        </TasksTaskCard>
      </li>
      </ul>

      <!-- Root drop zone (when dragging) -->
      <div
        v-if="enableDragDrop && depth === 0 && draggedTask"
        class="mt-2 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 text-center text-sm text-gray-500 dark:text-gray-400 transition-colors"
        :class="{ 'border-primary-500 bg-primary-50 dark:bg-primary-900/20': true }"
        @dragover="handleRootDragOver"
        @drop="handleRootDrop"
      >
        Drop here to move to root level
      </div>

      <!-- Inline quick add at bottom of list -->
      <div v-if="projectId && depth === 0" class="mt-3">
        <TasksTaskQuickAdd
          :project-id="projectId"
          placeholder="Add a task..."
          @created="emit('task-created')"
        />
      </div>
    </template>
  </div>
</template>
