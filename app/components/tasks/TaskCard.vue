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
  (e: 'update-assignees', taskId: string, userIds: string[]): void
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
  { value: '', label: 'No Priority', color: 'bg-gray-400' },
  { value: 'low', label: 'Low', color: 'bg-gray-400' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-400' },
  { value: 'high', label: 'High', color: 'bg-orange-400' },
] as const

const priorityBadgeClasses: Record<string, string> = {
  '': 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  low: 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200',
  medium: 'bg-blue-400 text-blue-900 dark:bg-blue-500 dark:text-blue-100',
  high: 'bg-orange-400 text-orange-900 dark:bg-orange-500 dark:text-orange-100',
}

const statusOptions = [
  { value: 'todo', label: 'To Do', color: 'bg-blue-400' },
  { value: 'awaiting_approval', label: 'Awaiting Approval', color: 'bg-orange-400' },
  { value: 'open', label: 'Open', color: 'bg-green-400' },
  { value: 'in_review', label: 'In Review', color: 'bg-yellow-400' },
  { value: 'done', label: 'Done', color: 'bg-gray-400' },
] as const

const statusBadgeClasses: Record<string, string> = {
  todo: 'bg-blue-400 text-blue-900',
  awaiting_approval: 'bg-orange-400 text-orange-900',
  open: 'bg-green-400 text-green-900',
  in_review: 'bg-yellow-400 text-yellow-900',
  done: 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200',
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

function toggleAssignee(userId: string) {
  const currentIds = props.task.assignees?.map(a => a._id) || []
  const newIds = currentIds.includes(userId)
    ? currentIds.filter(id => id !== userId)
    : [...currentIds, userId]
  emit('update-assignees', props.task.id, newIds)
}

const openAssigneeDropdown = ref(false)

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
          role="img"
          aria-label="Drag to reorder"
          @mousedown.stop
        >
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
          </svg>
        </div>

        <!-- Task ID - copyable -->
        <button
          class="flex-shrink-0 px-1.5 py-0.5 text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer min-h-[28px] flex items-center"
          :title="copied ? 'Copied!' : 'Click to copy ID'"
          :aria-label="copied ? 'ID copied to clipboard' : `Copy task ID ${shortId}`"
          @click="copyId"
        >
          <span v-if="copied" class="text-green-600 dark:text-green-400">Copied!</span>
          <span v-else>{{ shortId }}</span>
        </button>

        <!-- Expand button for subtasks -->
        <button
          v-if="task.subtaskCount > 0"
          class="mt-0.5 p-1.5 sm:p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center"
          :aria-expanded="expanded"
          :aria-label="expanded ? 'Collapse subtasks' : `Expand ${task.subtaskCount} subtasks`"
          @click.stop="expanded = !expanded; emit('toggle-expand', task)"
        >
          <svg
            class="h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform"
            :class="{ 'rotate-90': expanded }"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
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
          <select
            :value="task.status"
            aria-label="Task status"
            class="appearance-none pl-2 pr-6 py-1.5 sm:py-1 text-xs font-medium border-0 cursor-pointer focus:ring-1 focus:ring-primary-500 transition-colors min-h-[32px] sm:min-h-0 dark:[color-scheme:dark]"
            :class="statusBadgeClasses[task.status]"
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
            class="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-current opacity-70 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
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
                aria-label="Task priority"
                class="appearance-none px-2 py-1 sm:py-0.5 pr-5 text-xs font-medium border-0 cursor-pointer focus:ring-1 focus:ring-primary-500 transition-colors min-h-[28px] sm:min-h-0 dark:[color-scheme:dark]"
                :class="priorityBadgeClasses[task.priority || '']"
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
                class="absolute right-0.5 top-1/2 -translate-y-1/2 h-3 w-3 text-current opacity-70 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
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
                aria-label="Task milestone"
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
                aria-hidden="true"
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

        <!-- Assignees multiselect -->
        <div class="relative flex-shrink-0">
          <button
            class="flex items-center gap-1.5 px-2 py-1.5 sm:py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer min-h-[32px] sm:min-h-0"
            :aria-expanded="openAssigneeDropdown"
            aria-haspopup="listbox"
            :aria-label="`Assignees: ${task.assignees?.length ? (task.assignees.length === 1 ? task.assignees[0].name : `${task.assignees.length} assigned`) : 'Unassigned'}`"
            @click.stop="openAssigneeDropdown = !openAssigneeDropdown"
          >
            <div v-if="task.assignees && task.assignees.length > 0" class="flex -space-x-1">
              <template v-for="(assignee, idx) in task.assignees.slice(0, 2)" :key="assignee._id">
                <div
                  v-if="assignee.avatar"
                  class="w-5 h-5 rounded-full bg-cover bg-center border border-white dark:border-gray-700"
                  :style="{ backgroundImage: `url(${assignee.avatar})`, zIndex: 2 - idx }"
                />
                <div
                  v-else
                  class="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-[10px] font-medium text-gray-600 dark:text-gray-300 border border-white dark:border-gray-700"
                  :style="{ zIndex: 2 - idx }"
                >
                  {{ assignee.name.charAt(0) }}
                </div>
              </template>
            </div>
            <span class="text-gray-700 dark:text-gray-300">
              {{ task.assignees?.length ? (task.assignees.length === 1 ? task.assignees[0].name : `${task.assignees.length} assigned`) : 'Unassigned' }}
            </span>
            <svg class="h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Dropdown -->
          <div
            v-if="openAssigneeDropdown"
            role="listbox"
            aria-multiselectable="true"
            aria-label="Select assignees"
            class="absolute z-20 mt-1 right-0 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg max-h-60 overflow-auto"
            @click.stop
          >
            <div v-if="projectUsers.filter(u => u.role === 'team').length" class="py-1">
              <div class="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase" aria-hidden="true">Team</div>
              <button
                v-for="user in projectUsers.filter(u => u.role === 'team')"
                :key="user.id"
                type="button"
                role="option"
                :aria-selected="task.assignees?.some(a => a._id === user.id)"
                class="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="toggleAssignee(user.id)"
              >
                <span class="flex-1 text-gray-900 dark:text-gray-100">{{ user.name }}</span>
                <svg v-if="task.assignees?.some(a => a._id === user.id)" class="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
            <div v-if="projectUsers.filter(u => u.role === 'client').length" class="py-1 border-t border-gray-200 dark:border-gray-700">
              <div class="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase" aria-hidden="true">Client</div>
              <button
                v-for="user in projectUsers.filter(u => u.role === 'client')"
                :key="user.id"
                type="button"
                role="option"
                :aria-selected="task.assignees?.some(a => a._id === user.id)"
                class="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="toggleAssignee(user.id)"
              >
                <span class="flex-1 text-gray-900 dark:text-gray-100">{{ user.name }}</span>
                <svg v-if="task.assignees?.some(a => a._id === user.id)" class="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
            <div v-if="!projectUsers.some(u => u.role)" class="py-1">
              <button
                v-for="user in projectUsers"
                :key="user.id"
                type="button"
                role="option"
                :aria-selected="task.assignees?.some(a => a._id === user.id)"
                class="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="toggleAssignee(user.id)"
              >
                <span class="flex-1 text-gray-900 dark:text-gray-100">{{ user.name }}</span>
                <svg v-if="task.assignees?.some(a => a._id === user.id)" class="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </div>
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
