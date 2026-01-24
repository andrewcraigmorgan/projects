<script setup lang="ts">
import type { Task } from '~/composables/useTasks'

interface ProjectUser {
  id: string
  name: string
  email: string
  avatar?: string
  role?: 'team' | 'client'
}

interface Milestone {
  id: string
  name: string
}

interface Props {
  task: Task
  depth?: number
  showEstimatedHours?: boolean
  projectUsers?: ProjectUser[]
  milestones?: Milestone[]
  projectCode?: string
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
  showEstimatedHours: false,
  projectUsers: () => [],
  milestones: () => [],
  projectCode: '',
})

const emit = defineEmits<{
  (e: 'click', task: Task): void
  (e: 'toggle-expand', task: Task): void
  (e: 'update-status', taskId: string, status: Task['status']): void
  (e: 'update-priority', taskId: string, priority: Task['priority']): void
  (e: 'update-assignee', taskId: string, userId: string | null): void
  (e: 'update-milestone', taskId: string, milestoneId: string | null): void
  (e: 'dragstart', task: Task, event: DragEvent): void
  (e: 'dragend', event: DragEvent): void
  (e: 'context-menu', task: Task, event: MouseEvent): void
}>()

const { isMobile } = useBreakpoints()

// Drag state
const isDragging = ref(false)

function handleDragStart(event: DragEvent) {
  isDragging.value = true
  emit('dragstart', props.task, event)
}

function handleDragEnd(event: DragEvent) {
  isDragging.value = false
  emit('dragend', event)
}

function handleContextMenu(event: MouseEvent) {
  event.preventDefault()
  emit('context-menu', props.task, event)
}

const expanded = ref(false)
const copied = ref(false)

const shortId = computed(() => {
  const prefix = props.projectCode || props.task.id.slice(0, 3).toUpperCase()
  const taskNum = props.task.taskNumber ?? 0
  return `${prefix}-T${taskNum}`
})

async function copyId(event: Event) {
  event.stopPropagation()
  const idToCopy = shortId.value
  try {
    await navigator.clipboard.writeText(idToCopy)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = idToCopy
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  }
}

const priorityOptions = [
  { value: '', label: 'No Priority', color: 'text-gray-400' },
  { value: 'low', label: 'Low', color: 'text-gray-600 dark:text-gray-300' },
  { value: 'medium', label: 'Medium', color: 'text-blue-600 dark:text-blue-300' },
  { value: 'high', label: 'High', color: 'text-orange-600 dark:text-orange-300' },
] as const

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300',
}

const statusOptions = [
  { value: 'todo', label: 'To Do', color: 'bg-gray-400' },
  { value: 'awaiting_approval', label: 'Awaiting Approval', color: 'bg-yellow-400' },
  { value: 'open', label: 'Open', color: 'bg-blue-400' },
  { value: 'in_review', label: 'In Review', color: 'bg-purple-400' },
  { value: 'done', label: 'Done', color: 'bg-green-500' },
] as const

const statusColors: Record<string, string> = {
  todo: 'bg-gray-400',
  awaiting_approval: 'bg-yellow-400',
  open: 'bg-blue-400',
  in_review: 'bg-purple-400',
  done: 'bg-green-500',
}

function onStatusChange(event: Event) {
  event.stopPropagation()
  const target = event.target as HTMLSelectElement
  emit('update-status', props.task.id, target.value as Task['status'])
}

function onPriorityChange(event: Event) {
  event.stopPropagation()
  const target = event.target as HTMLSelectElement
  const value = target.value || undefined
  emit('update-priority', props.task.id, value as Task['priority'])
}

function onAssigneeChange(event: Event) {
  event.stopPropagation()
  const target = event.target as HTMLSelectElement
  const value = target.value || null
  emit('update-assignee', props.task.id, value)
}

function onMilestoneChange(event: Event) {
  event.stopPropagation()
  const target = event.target as HTMLSelectElement
  const value = target.value || null
  emit('update-milestone', props.task.id, value)
}
</script>

<template>
  <div
    class="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all cursor-pointer"
    :class="{ 'opacity-50': isDragging }"
    :style="{ marginLeft: `${depth * 24}px` }"
    :draggable="!isMobile"
    @click="emit('click', task)"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @contextmenu="handleContextMenu"
  >
    <div class="p-3 sm:p-4">
      <div class="flex items-start gap-2 sm:gap-3">
        <!-- Drag handle - hidden on mobile/touch -->
        <div
          v-if="!isMobile"
          class="flex-shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hidden sm:block"
          @mousedown.stop
        >
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
          </svg>
        </div>

        <!-- Task ID - copyable -->
        <button
          class="flex-shrink-0 px-1.5 py-0.5 text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer min-h-[28px] flex items-center"
          :title="copied ? 'Copied!' : 'Click to copy ID'"
          @click="copyId"
        >
          <span v-if="copied" class="text-green-600 dark:text-green-400">Copied!</span>
          <span v-else>{{ shortId }}</span>
        </button>

        <!-- Expand button for subtasks -->
        <button
          v-if="task.subtaskCount > 0"
          class="mt-0.5 p-1.5 sm:p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center"
          @click.stop="expanded = !expanded; emit('toggle-expand', task)"
        >
          <svg
            class="h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform"
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
        <div v-else class="w-6 hidden sm:block" />

        <!-- Status dropdown -->
        <div class="relative flex-shrink-0">
          <div
            class="absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 pointer-events-none"
            :class="statusColors[task.status]"
          />
          <select
            :value="task.status"
            class="appearance-none pl-5 pr-6 py-1.5 sm:py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-0 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-1 focus:ring-primary-500 transition-colors min-h-[32px] sm:min-h-0 dark:[color-scheme:dark]"
            @click.stop
            @change="onStatusChange"
          >
            <option
              v-for="option in statusOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <svg
            class="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <div class="flex-1 min-w-0">
          <!-- Title -->
          <div class="flex items-center gap-2">
            <span
              v-if="task.isExternal"
              class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
              title="External task"
            >
              External
            </span>
            <h4
              class="text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              {{ task.title }}
            </h4>
          </div>

          <!-- Meta -->
          <div class="mt-1 flex items-center gap-2 flex-wrap">
            <!-- Priority dropdown -->
            <div class="relative">
              <select
                :value="task.priority || ''"
                class="appearance-none px-2 py-1 sm:py-0.5 pr-5 text-xs font-medium bg-gray-100 dark:bg-gray-700 border-0 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-1 focus:ring-primary-500 transition-colors min-h-[28px] sm:min-h-0 dark:[color-scheme:dark]"
                :class="task.priority ? priorityColors[task.priority] : 'text-gray-400 dark:text-gray-500'"
                @click.stop
                @change="onPriorityChange"
              >
                <option
                  v-for="option in priorityOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
              <svg
                class="absolute right-0.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <span
              v-if="showEstimatedHours && task.estimatedHours"
              class="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
            >
              {{ task.estimatedHours }}h est.
            </span>

            <span
              v-if="task.dueDate"
              class="text-xs text-gray-500 dark:text-gray-400"
            >
              Due {{ new Date(task.dueDate).toLocaleDateString() }}
            </span>

            <!-- Milestone selector -->
            <div v-if="milestones.length" class="relative">
              <select
                :value="task.milestone?.id || ''"
                class="appearance-none px-2 py-1 sm:py-0.5 pr-5 text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-0 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 focus:ring-1 focus:ring-indigo-500 transition-colors min-h-[28px] sm:min-h-0 dark:[color-scheme:dark]"
                @click.stop
                @change="onMilestoneChange"
              >
                <option value="">No Milestone</option>
                <option
                  v-for="milestone in milestones"
                  :key="milestone.id"
                  :value="milestone.id"
                >
                  {{ milestone.name }}
                </option>
              </select>
              <svg
                class="absolute right-0.5 top-1/2 -translate-y-1/2 h-3 w-3 text-indigo-500 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <span
              v-if="task.subtaskCount > 0"
              class="text-xs text-gray-500 dark:text-gray-400"
            >
              {{ task.subtaskCount }} subtask{{ task.subtaskCount !== 1 ? 's' : '' }}
            </span>

            <!-- Tags -->
            <template v-if="task.tags?.length">
              <span
                v-for="tag in task.tags"
                :key="tag.id"
                class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-white"
                :style="{ backgroundColor: tag.color }"
              >
                {{ tag.name }}
              </span>
            </template>
          </div>
        </div>

        <!-- Assignee selector -->
        <div class="relative flex-shrink-0">
          <select
            :value="task.assignee?.id || ''"
            class="appearance-none pl-2 pr-6 py-1.5 sm:py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 border-0 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-1 focus:ring-primary-500 transition-colors min-h-[32px] sm:min-h-0 dark:[color-scheme:dark]"
            :class="task.assignee?.role === 'client'
              ? 'text-orange-600 dark:text-orange-300'
              : 'text-gray-700 dark:text-gray-300'"
            @click.stop
            @change="onAssigneeChange"
          >
            <option value="">Unassigned</option>
            <optgroup v-if="projectUsers.filter(u => u.role === 'team').length" label="Team">
              <option
                v-for="user in projectUsers.filter(u => u.role === 'team')"
                :key="user.id"
                :value="user.id"
              >
                {{ user.name }}
              </option>
            </optgroup>
            <optgroup v-if="projectUsers.filter(u => u.role === 'client').length" label="Client">
              <option
                v-for="user in projectUsers.filter(u => u.role === 'client')"
                :key="user.id"
                :value="user.id"
              >
                {{ user.name }}
              </option>
            </optgroup>
            <template v-if="!projectUsers.filter(u => u.role).length">
              <option
                v-for="user in projectUsers"
                :key="user.id"
                :value="user.id"
              >
                {{ user.name }}
              </option>
            </template>
          </select>
          <svg
            class="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Subtasks slot -->
    <div v-if="expanded && task.subtasks?.length">
      <div class="border-t border-gray-100 dark:border-gray-700 px-3 sm:px-4 py-2 bg-gray-50 dark:bg-gray-900">
        <slot name="subtasks" :subtasks="task.subtasks" />
      </div>
    </div>
  </div>
</template>
