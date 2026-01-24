<script setup lang="ts">
import type { Task } from '~/composables/useTasks'

interface Column {
  id: string
  label: string
  width?: string
}

interface AssigneeOption {
  id: string
  name: string
  email: string
  avatar?: string
}

interface Props {
  tasks: Task[]
  loading?: boolean
  projectId?: string
  projectCode?: string
  enableDragDrop?: boolean
  parentTaskId?: string
  assigneeOptions?: AssigneeOption[]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  projectId: '',
  projectCode: '',
  enableDragDrop: true,
  parentTaskId: undefined,
  assigneeOptions: () => [],
})

const emit = defineEmits<{
  (e: 'select', task: Task): void
  (e: 'task-created'): void
  (e: 'update-status', task: Task, status: Task['status']): void
  (e: 'update-priority', task: Task, priority: Task['priority']): void
  (e: 'update-due-date', task: Task, dueDate: string | null): void
  (e: 'update-assignee', task: Task, assigneeId: string | null): void
  (e: 'move-task', taskId: string, newParentTask: string | null, newOrder: number): void
  (e: 'context-menu', task: Task, event: MouseEvent): void
}>()

const { isMobile } = useBreakpoints()

// Drag-and-drop state
const draggedTask = ref<Task | null>(null)
const dragOverIndex = ref<number | null>(null)

function handleDragStart(task: Task, event: DragEvent) {
  if (!props.enableDragDrop) return
  draggedTask.value = task
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', task.id)
  }
  // Add dragging class to row
  const row = event.currentTarget as HTMLElement
  row.classList.add('opacity-50')
}

function handleDragEnd(event: DragEvent) {
  draggedTask.value = null
  dragOverIndex.value = null
  const row = event.currentTarget as HTMLElement
  row.classList.remove('opacity-50')
}

function handleDragOver(index: number, event: DragEvent) {
  if (!props.enableDragDrop || !draggedTask.value) return
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  dragOverIndex.value = index
}

function handleDragLeave() {
  dragOverIndex.value = null
}

function handleDrop(targetTask: Task, index: number, event: DragEvent) {
  if (!props.enableDragDrop || !draggedTask.value) return
  if (draggedTask.value.id === targetTask.id) {
    draggedTask.value = null
    dragOverIndex.value = null
    return
  }

  event.preventDefault()

  // Calculate new order - insert before the target task
  const newOrder = targetTask.order
  emit('move-task', draggedTask.value.id, null, newOrder)

  draggedTask.value = null
  dragOverIndex.value = null
}

function handleContextMenu(task: Task, event: MouseEvent) {
  event.preventDefault()
  emit('context-menu', task, event)
}

const availableColumns: Column[] = [
  { id: 'title', label: 'Title', width: 'flex-1' },
  { id: 'status', label: 'Status', width: 'w-28' },
  { id: 'priority', label: 'Priority', width: 'w-24' },
  { id: 'assignee', label: 'Assignee', width: 'w-32' },
  { id: 'dueDate', label: 'Due Date', width: 'w-28' },
  { id: 'subtaskCount', label: 'Subtasks', width: 'w-20' },
  { id: 'createdAt', label: 'Created', width: 'w-28' },
  { id: 'updatedAt', label: 'Updated', width: 'w-28' },
]

const defaultVisibleColumns = ['title', 'status', 'priority', 'assignee', 'dueDate']

// Column visibility state
const visibleColumnIds = ref<string[]>(defaultVisibleColumns)

// Load from localStorage on mount
onMounted(() => {
  const saved = localStorage.getItem('taskTableColumns')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.every(id => typeof id === 'string')) {
        // Ensure title is always visible
        if (!parsed.includes('title')) {
          parsed.unshift('title')
        }
        visibleColumnIds.value = parsed
      }
    } catch {
      // Use default if parsing fails
    }
  }
})

// Save to localStorage when changed
watch(visibleColumnIds, (value) => {
  localStorage.setItem('taskTableColumns', JSON.stringify(value))
}, { deep: true })

// Computed visible columns
const visibleColumns = computed(() => {
  return availableColumns.filter(col => visibleColumnIds.value.includes(col.id))
})

// Column config dropdown state
const showColumnConfig = ref(false)
const configButtonRef = ref<HTMLButtonElement | null>(null)

function toggleColumn(columnId: string) {
  // Title cannot be toggled off
  if (columnId === 'title') return

  const index = visibleColumnIds.value.indexOf(columnId)
  if (index === -1) {
    visibleColumnIds.value.push(columnId)
  } else {
    visibleColumnIds.value.splice(index, 1)
  }
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  if (configButtonRef.value && !configButtonRef.value.contains(event.target as Node)) {
    const dropdown = document.getElementById('column-config-dropdown')
    if (dropdown && !dropdown.contains(event.target as Node)) {
      showColumnConfig.value = false
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Status display
const statusOptions = [
  { value: 'todo', label: 'To Do', color: 'bg-gray-400' },
  { value: 'awaiting_approval', label: 'Awaiting', color: 'bg-yellow-400' },
  { value: 'open', label: 'Open', color: 'bg-blue-400' },
  { value: 'in_review', label: 'In Review', color: 'bg-purple-400' },
  { value: 'done', label: 'Done', color: 'bg-green-500' },
]

const statusLabels: Record<string, string> = {
  todo: 'To Do',
  awaiting_approval: 'Awaiting',
  open: 'Open',
  in_review: 'In Review',
  done: 'Done',
}

const statusColors: Record<string, string> = {
  todo: 'bg-gray-400',
  awaiting_approval: 'bg-yellow-400',
  open: 'bg-blue-400',
  in_review: 'bg-purple-400',
  done: 'bg-green-500',
}

// Handle status change
function onStatusChange(task: Task, value: string) {
  emit('update-status', task, value as Task['status'])
}

// Handle priority change
function onPriorityChange(task: Task, value: string) {
  emit('update-priority', task, value as Task['priority'])
}

// Handle due date change
function onDueDateChange(task: Task, event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.value || null
  emit('update-due-date', task, value)
}

// Handle assignee change
function onAssigneeChange(task: Task, value: string) {
  emit('update-assignee', task, value || null)
}

// Computed assignee options for dropdown
const assigneeDropdownOptions = computed(() => {
  return [
    { value: '', label: 'Unassigned' },
    ...props.assigneeOptions.map(u => ({
      value: u.id,
      label: u.name,
    }))
  ]
})

// Priority options for dropdown
const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-gray-400' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-400' },
  { value: 'high', label: 'High', color: 'bg-orange-400' },
]

// Priority display
const priorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

const priorityColors: Record<string, string> = {
  low: 'text-gray-600 dark:text-gray-400',
  medium: 'text-blue-600 dark:text-blue-400',
  high: 'text-orange-600 dark:text-orange-400',
}

// Format date
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Format date with time
function formatDateTime(dateStr: string | undefined): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

// Get short task ID
function getShortId(task: Task): string {
  const prefix = props.projectCode || task.id.slice(0, 3).toUpperCase()
  const taskNum = task.taskNumber ?? 0
  return `${prefix}-T${taskNum}`
}

// Get cell value
function getCellValue(task: Task, columnId: string): string {
  switch (columnId) {
    case 'title':
      return task.title
    case 'status':
      return statusLabels[task.status] || task.status
    case 'priority':
      return task.priority ? priorityLabels[task.priority] : '-'
    case 'assignee':
      return task.assignee?.name || '-'
    case 'dueDate':
      return formatDate(task.dueDate)
    case 'subtaskCount':
      return task.subtaskCount > 0 ? String(task.subtaskCount) : '-'
    case 'createdAt':
      return formatDateTime(task.createdAt)
    case 'updatedAt':
      return formatDateTime(task.updatedAt)
    default:
      return ''
  }
}
</script>

<template>
  <!-- Loading state -->
  <div v-if="loading" class="text-center py-8">
    <svg
      class="animate-spin h-8 w-8 mx-auto text-primary-600"
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
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  </div>

  <template v-else>
    <!-- Desktop: Table view -->
    <div class="hidden lg:block overflow-x-auto">
      <table class="w-full min-w-full border-collapse">
        <!-- Header -->
        <thead class="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <!-- ID column (always visible) -->
            <th class="w-24 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              ID
            </th>
            <!-- Dynamic columns -->
            <th
              v-for="column in visibleColumns"
              :key="column.id"
              class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              :class="column.width"
            >
              {{ column.label }}
            </th>
            <!-- Config column -->
            <th class="w-10 px-2 py-2 text-right relative">
              <button
                ref="configButtonRef"
                class="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Configure columns"
                @click.stop="showColumnConfig = !showColumnConfig"
              >
                <svg class="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
              <!-- Dropdown -->
              <div
                v-if="showColumnConfig"
                id="column-config-dropdown"
                class="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg z-20"
              >
                <div class="py-1">
                  <label
                    v-for="column in availableColumns"
                    :key="column.id"
                    class="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    :class="{ 'opacity-50 cursor-not-allowed': column.id === 'title' }"
                  >
                    <input
                      type="checkbox"
                      :checked="visibleColumnIds.includes(column.id)"
                      :disabled="column.id === 'title'"
                      class="h-4 w-4 text-primary-600 border-gray-300 dark:border-gray-600 focus:ring-primary-500"
                      @change="toggleColumn(column.id)"
                    />
                    <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">{{ column.label }}</span>
                  </label>
                </div>
              </div>
            </th>
          </tr>
        </thead>

        <!-- Body -->
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
          <template v-if="tasks.length === 0">
            <tr v-if="!projectId">
              <td :colspan="visibleColumns.length + 2" class="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                No tasks found
              </td>
            </tr>
          </template>

          <template v-else>
            <tr
              v-for="(task, index) in tasks"
              :key="task.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all"
              :class="{
                'border-t-2 border-t-primary-500': dragOverIndex === index && draggedTask?.id !== task.id
              }"
              draggable="true"
              @click="emit('select', task)"
              @dragstart="handleDragStart(task, $event)"
              @dragend="handleDragEnd"
              @dragover="handleDragOver(index, $event)"
              @dragleave="handleDragLeave"
              @drop="handleDrop(task, index, $event)"
              @contextmenu="handleContextMenu(task, $event)"
            >
              <!-- Drag handle + ID column -->
              <td class="px-3 py-2 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <div
                    v-if="enableDragDrop"
                    class="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    @mousedown.stop
                  >
                    <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                    </svg>
                  </div>
                  <span class="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5">
                    {{ getShortId(task) }}
                  </span>
                </div>
              </td>
              <!-- Dynamic columns -->
              <td
                v-for="column in visibleColumns"
                :key="column.id"
                class="px-3 py-2 whitespace-nowrap"
                :class="column.width"
              >
                <!-- Title column -->
                <template v-if="column.id === 'title'">
                  <div class="flex items-center gap-2">
                    <span
                      v-if="task.isExternal"
                      class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                    >
                      Ext
                    </span>
                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-md">
                      {{ task.title }}
                    </span>
                  </div>
                </template>

                <!-- Status column -->
                <template v-else-if="column.id === 'status'">
                  <UiDropdown
                    :model-value="task.status"
                    :options="statusOptions"
                    show-dot
                    @click.stop
                    @update:model-value="onStatusChange(task, $event)"
                  />
                </template>

                <!-- Priority column -->
                <template v-else-if="column.id === 'priority'">
                  <UiDropdown
                    :model-value="task.priority || ''"
                    :options="priorityOptions"
                    placeholder="-"
                    show-dot
                    @click.stop
                    @update:model-value="onPriorityChange(task, $event)"
                  />
                </template>

                <!-- Assignee column -->
                <template v-else-if="column.id === 'assignee'">
                  <div class="flex items-center gap-1.5 min-w-[120px]" @click.stop>
                    <div
                      v-if="task.assignee?.avatar"
                      class="w-5 h-5 rounded-full bg-cover bg-center flex-shrink-0"
                      :style="{ backgroundImage: `url(${task.assignee.avatar})` }"
                    />
                    <div
                      v-else-if="task.assignee"
                      class="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 flex-shrink-0"
                    >
                      {{ task.assignee.name.charAt(0) }}
                    </div>
                    <select
                      :value="task.assignee?._id || ''"
                      class="flex-1 min-w-0 appearance-none text-xs bg-transparent border-0 p-0 pr-4 text-gray-700 dark:text-gray-300 focus:ring-0 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 truncate"
                      @change="onAssigneeChange(task, ($event.target as HTMLSelectElement).value)"
                    >
                      <option value="">Unassigned</option>
                      <option
                        v-for="user in assigneeOptions"
                        :key="user.id"
                        :value="user.id"
                      >
                        {{ user.name }}
                      </option>
                    </select>
                  </div>
                </template>

                <!-- Subtask count column -->
                <template v-else-if="column.id === 'subtaskCount'">
                  <div
                    v-if="task.subtaskCount > 0"
                    class="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 font-medium"
                  >
                    {{ task.subtaskCount }}
                    <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <span v-else class="text-xs text-gray-400 dark:text-gray-500">-</span>
                </template>

                <!-- Due date column -->
                <template v-else-if="column.id === 'dueDate'">
                  <input
                    type="date"
                    :value="task.dueDate?.slice(0, 10) || ''"
                    class="text-xs bg-transparent border-0 p-0 text-gray-600 dark:text-gray-300 focus:ring-0 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 [color-scheme:light] dark:[color-scheme:dark]"
                    @click.stop
                    @change="onDueDateChange(task, $event)"
                  />
                </template>

                <!-- Default text columns (dates, etc) -->
                <template v-else>
                  <span class="text-xs text-gray-600 dark:text-gray-400">
                    {{ getCellValue(task, column.id) }}
                  </span>
                </template>
              </td>
              <!-- Empty config column -->
              <td class="w-10 px-2 py-2" />
            </tr>
          </template>

          <!-- Quick add row -->
          <tr v-if="projectId">
            <td :colspan="visibleColumns.length + 2" class="px-0 py-0">
              <TasksTaskQuickAdd
                :project-id="projectId"
                :parent-task-id="parentTaskId"
                :placeholder="parentTaskId ? 'Add a subtask...' : 'Add a task...'"
                @created="emit('task-created')"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile: Card list view -->
    <div class="lg:hidden space-y-2">
      <template v-if="tasks.length === 0 && !projectId">
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          No tasks found
        </div>
      </template>

      <template v-else>
        <div
          v-for="task in tasks"
          :key="task.id"
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 cursor-pointer active:bg-gray-50 dark:active:bg-gray-700 transition-colors"
          @click="emit('select', task)"
          @contextmenu="handleContextMenu(task, $event)"
        >
          <!-- Task ID and Title -->
          <div class="flex items-start gap-3 mb-3">
            <span class="flex-shrink-0 text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5">
              {{ getShortId(task) }}
            </span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span
                  v-if="task.isExternal"
                  class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                >
                  Ext
                </span>
                <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                  {{ task.title }}
                </h4>
              </div>
            </div>
          </div>

          <!-- Status, Priority, Assignee row -->
          <div class="flex items-center gap-2 flex-wrap">
            <!-- Status badge -->
            <div class="flex items-center gap-1.5">
              <div class="h-2 w-2 flex-shrink-0" :class="statusColors[task.status]" />
              <span class="text-xs text-gray-600 dark:text-gray-400">
                {{ statusLabels[task.status] }}
              </span>
            </div>

            <!-- Priority badge -->
            <span
              v-if="task.priority"
              class="inline-flex items-center px-2 py-0.5 text-xs font-medium"
              :class="{
                'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300': task.priority === 'low',
                'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300': task.priority === 'medium',
                'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300': task.priority === 'high',
              }"
            >
              {{ priorityLabels[task.priority] }}
            </span>

            <!-- Subtask count -->
            <span
              v-if="task.subtaskCount > 0"
              class="text-xs text-primary-600 dark:text-primary-400"
            >
              {{ task.subtaskCount }} subtask{{ task.subtaskCount !== 1 ? 's' : '' }}
            </span>

            <!-- Due date -->
            <span
              v-if="task.dueDate"
              class="text-xs text-gray-500 dark:text-gray-400"
            >
              Due {{ formatDate(task.dueDate) }}
            </span>

            <!-- Assignee (pushed to end) -->
            <div
              v-if="task.assignee"
              class="flex items-center gap-1.5 ml-auto"
            >
              <div
                v-if="task.assignee.avatar"
                class="w-6 h-6 rounded-full bg-cover bg-center flex-shrink-0"
                :style="{ backgroundImage: `url(${task.assignee.avatar})` }"
              />
              <div
                v-else
                class="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-medium text-primary-700 dark:text-primary-300 flex-shrink-0"
              >
                {{ task.assignee.name.charAt(0) }}
              </div>
              <span class="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[80px]">
                {{ task.assignee.name }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <!-- Quick add on mobile -->
      <div v-if="projectId" class="pt-2">
        <TasksTaskQuickAdd
          :project-id="projectId"
          :parent-task-id="parentTaskId"
          :placeholder="parentTaskId ? 'Add a subtask...' : 'Add a task...'"
          @created="emit('task-created')"
        />
      </div>
    </div>
  </template>
</template>
