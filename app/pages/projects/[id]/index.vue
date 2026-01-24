<script setup lang="ts">
import { useApi } from '~/composables/useApi'
import { useTasks, type Task } from '~/composables/useTasks'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const { fetchApi } = useApi()

const projectId = computed(() => route.params.id as string)

// Project data
const project = ref<{
  id: string
  code: string
  name: string
  description: string
  status: string
} | null>(null)

const projectLoading = ref(true)
const projectError = ref(false)

// Tasks
const {
  tasks,
  loading: tasksLoading,
  fetchTasks,
  createTask,
  updateTask,
  getTaskWithSubtasks,
  moveTask,
} = useTasks(projectId)

// Context menu state
const contextMenuTask = ref<Task | null>(null)
const contextMenuPosition = ref({ x: 0, y: 0 })
const showContextMenu = ref(false)

// Move to project modal
const showMoveModal = ref(false)
const taskToMove = ref<Task | null>(null)

// View mode (from URL param, then localStorage, then default to 'list')
const viewMode = ref<'list' | 'board'>('list')

// Filters (synced with URL) - now arrays for multi-select
const statusFilter = ref<string[]>([])
const priorityFilter = ref<string[]>([])
const dueDateFrom = ref<string>('')
const dueDateTo = ref<string>('')

const statusOptions = [
  { value: 'todo', label: 'To Do', color: 'bg-gray-400' },
  { value: 'awaiting_approval', label: 'Awaiting', color: 'bg-yellow-400' },
  { value: 'open', label: 'Open', color: 'bg-blue-400' },
  { value: 'in_review', label: 'In Review', color: 'bg-purple-400' },
  { value: 'done', label: 'Done', color: 'bg-green-500' },
]

const priorityOptions = [
  { value: 'high', label: 'High', color: 'bg-orange-400' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-400' },
  { value: 'low', label: 'Low', color: 'bg-gray-400' },
]

// Default "All Open" status filter (excludes 'done')
const defaultOpenStatuses = ['todo', 'awaiting_approval', 'open', 'in_review']

// Preset views
const presets = [
  { name: 'All Open', statuses: defaultOpenStatuses, priorities: [], dueDateFrom: '', dueDateTo: '' },
  { name: 'All Tasks', statuses: [], priorities: [], dueDateFrom: '', dueDateTo: '' },
  { name: 'High Priority', statuses: defaultOpenStatuses, priorities: ['high'], dueDateFrom: '', dueDateTo: '' },
  { name: 'Done', statuses: ['done'], priorities: [], dueDateFrom: '', dueDateTo: '' },
]

// Current preset name (for display)
const currentPreset = computed(() => {
  for (const preset of presets) {
    const statusMatch = arraysEqual(statusFilter.value.slice().sort(), preset.statuses.slice().sort())
    const priorityMatch = arraysEqual(priorityFilter.value.slice().sort(), preset.priorities.slice().sort())
    const dateFromMatch = dueDateFrom.value === preset.dueDateFrom
    const dateToMatch = dueDateTo.value === preset.dueDateTo
    if (statusMatch && priorityMatch && dateFromMatch && dateToMatch) {
      return preset.name
    }
  }
  return 'Custom'
})

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}

function applyPreset(preset: typeof presets[0]) {
  statusFilter.value = [...preset.statuses]
  priorityFilter.value = [...preset.priorities]
  dueDateFrom.value = preset.dueDateFrom
  dueDateTo.value = preset.dueDateTo
}

// Computed: any filters different from "All Open" default
const hasActiveFilters = computed(() => {
  const isDefault = arraysEqual(statusFilter.value.slice().sort(), defaultOpenStatuses.slice().sort())
  const hasNoOtherFilters = priorityFilter.value.length === 0 && !dueDateFrom.value && !dueDateTo.value
  if (isDefault && hasNoOtherFilters) {
    return false
  }
  return true
})

// Clear all filters (reset to "All Open")
function clearFilters() {
  statusFilter.value = [...defaultOpenStatuses]
  priorityFilter.value = []
  dueDateFrom.value = ''
  dueDateTo.value = ''
}

onMounted(() => {
  // Check URL params
  const urlView = route.query.view as string
  const urlStatus = route.query.status as string
  const urlPriority = route.query.priority as string
  const urlDueDateFrom = route.query.dueDateFrom as string
  const urlDueDateTo = route.query.dueDateTo as string

  if (urlView === 'list' || urlView === 'board') {
    viewMode.value = urlView
  } else {
    // Fall back to localStorage
    const saved = localStorage.getItem('taskViewMode')
    if (saved === 'list' || saved === 'board') {
      viewMode.value = saved
    }
  }

  // Initialize filters from URL (comma-separated values)
  let hasUrlFilters = false
  if (urlStatus) {
    const statuses = urlStatus.split(',').filter(s => statusOptions.some(o => o.value === s))
    if (statuses.length > 0) {
      statusFilter.value = statuses
      hasUrlFilters = true
    }
  }
  if (urlPriority) {
    const priorities = urlPriority.split(',').filter(p => priorityOptions.some(o => o.value === p))
    if (priorities.length > 0) {
      priorityFilter.value = priorities
      hasUrlFilters = true
    }
  }
  if (urlDueDateFrom) {
    dueDateFrom.value = urlDueDateFrom
    hasUrlFilters = true
  }
  if (urlDueDateTo) {
    dueDateTo.value = urlDueDateTo
    hasUrlFilters = true
  }

  // Apply default "All Open" preset if no URL filters specified
  if (!hasUrlFilters) {
    statusFilter.value = [...defaultOpenStatuses]
  }
})

watch(viewMode, (value) => {
  localStorage.setItem('taskViewMode', value)
  updateUrlParams()
})

// Update URL when filters change
watch([statusFilter, priorityFilter, dueDateFrom, dueDateTo], () => {
  updateUrlParams()
  loadTasks()
}, { deep: true })

function updateUrlParams() {
  const query: Record<string, string> = {}
  if (viewMode.value !== 'list') query.view = viewMode.value
  if (statusFilter.value.length > 0) query.status = statusFilter.value.join(',')
  if (priorityFilter.value.length > 0) query.priority = priorityFilter.value.join(',')
  if (dueDateFrom.value) query.dueDateFrom = dueDateFrom.value
  if (dueDateTo.value) query.dueDateTo = dueDateTo.value

  router.replace({ query })
}

// Modals
const showCreateModal = ref(false)
const parentTaskForCreate = ref<Task | null>(null)
const saving = ref(false)

// Navigate to task detail page
function navigateToTask(task: Task) {
  router.push(`/projects/${projectId.value}/tasks/${task.id}?from=${viewMode.value}`)
}

// Fetch project
async function loadProject() {
  projectLoading.value = true
  projectError.value = false
  try {
    const response = await fetchApi<{
      success: boolean
      data: { project: typeof project.value }
    }>(`/api/projects/${projectId.value}`)

    if (response.success) {
      project.value = response.data.project
    } else {
      projectError.value = true
    }
  } catch {
    projectError.value = true
  } finally {
    projectLoading.value = false
  }
}

// Load tasks
async function loadTasks() {
  await fetchTasks({
    rootOnly: true,
    status: statusFilter.value.length > 0 ? statusFilter.value : undefined,
    priority: priorityFilter.value.length > 0 ? priorityFilter.value : undefined,
    dueDateFrom: dueDateFrom.value || undefined,
    dueDateTo: dueDateTo.value || undefined,
  })
}

// Handle task creation
async function handleCreateTask(data: {
  title: string
  description: string
  status: Task['status']
  priority: Task['priority']
  dueDate?: string
  parentTask?: string
}) {
  saving.value = true
  try {
    await createTask(data)
    showCreateModal.value = false
    parentTaskForCreate.value = null
    await loadTasks()
  } finally {
    saving.value = false
  }
}

// Handle task status update (for Kanban)
async function handleUpdateStatus(task: Task, status: Task['status']) {
  await updateTask(task.id, { status })
  await loadTasks()
}

// Handle task priority update
async function handleUpdatePriority(task: Task, priority: Task['priority']) {
  await updateTask(task.id, { priority })
  await loadTasks()
}

// Handle task due date update
async function handleUpdateDueDate(task: Task, dueDate: string | null) {
  await updateTask(task.id, { dueDate: dueDate || undefined })
  await loadTasks()
}

// Load subtasks for expanded task
async function handleLoadSubtasks(task: Task) {
  const fullTask = await getTaskWithSubtasks(task.id)
  if (fullTask?.subtasks) {
    // Update the task in the list with subtasks
    const index = tasks.value.findIndex((t) => t.id === task.id)
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index], subtasks: fullTask.subtasks as Task[] }
    }
  }
}

// Context menu handlers
function handleContextMenu(task: Task, event: MouseEvent) {
  contextMenuTask.value = task
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
  showContextMenu.value = true
}

function closeContextMenu() {
  showContextMenu.value = false
  contextMenuTask.value = null
}

function handleMoveToProjectClick(task: Task) {
  taskToMove.value = task
  showMoveModal.value = true
}

async function handleMoveToProject(destinationProjectId: string) {
  if (!taskToMove.value) return

  try {
    const response = await moveTask(taskToMove.value.id, null, undefined, destinationProjectId)
    if (response.success) {
      // Remove task from current list since it moved to another project
      tasks.value = tasks.value.filter(t => t.id !== taskToMove.value?.id)
      showMoveModal.value = false
      taskToMove.value = null
    }
  } catch (error) {
    console.error('Failed to move task:', error)
  }
}

async function handleDeleteTask(task: Task) {
  if (!confirm(`Are you sure you want to delete "${task.title}"?`)) return

  try {
    await fetchApi(`/api/tasks/${task.id}`, { method: 'DELETE' })
    await loadTasks()
  } catch (error) {
    console.error('Failed to delete task:', error)
  }
}

// Handle task reorder within same project
async function handleMoveTask(taskId: string, newParentTask: string | null, newOrder: number) {
  try {
    await moveTask(taskId, newParentTask, newOrder)
    await loadTasks()
  } catch (error) {
    console.error('Failed to move task:', error)
  }
}

// Set page title
useHead({
  title: computed(() => project.value?.name ? `${project.value.name} - Projects` : 'Projects'),
})

// Initial load
onMounted(async () => {
  await loadProject()

  // Only remember project if it loaded successfully
  if (!projectError.value && project.value) {
    localStorage.setItem('lastProjectId', projectId.value)
    await loadTasks()
  } else {
    // Clear invalid project from localStorage
    localStorage.removeItem('lastProjectId')
  }
})
</script>

<template>
  <div>
    <LayoutHeader back-link="/projects">
      <template #title>
        <div v-if="projectLoading" class="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div v-else>
          <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {{ project?.name }}
          </h1>
          <p v-if="project?.description" class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ project.description }}
          </p>
        </div>
      </template>
      <template #actions>
        <div class="flex items-center gap-3">
          <!-- Milestones link -->
          <NuxtLink
            :to="`/projects/${projectId}/milestones`"
            class="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
          >
            Milestones
          </NuxtLink>

          <!-- Filters -->
          <div class="flex items-center gap-2">
            <!-- Preset selector -->
            <select
              :value="currentPreset"
              class="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500 focus:outline-none font-medium"
              @change="(e: Event) => {
                const preset = presets.find(p => p.name === (e.target as HTMLSelectElement).value)
                if (preset) {
                  applyPreset(preset)
                }
              }"
            >
              <option v-for="preset in presets" :key="preset.name" :value="preset.name">
                {{ preset.name }}
              </option>
              <option v-if="currentPreset === 'Custom'" value="Custom">Custom</option>
            </select>

            <div class="h-4 w-px bg-gray-300 dark:bg-gray-600" />

            <UiFilterDropdown
              v-model="statusFilter"
              :options="statusOptions"
              label="Status"
              placeholder="Status"
            />
            <UiFilterDropdown
              v-model="priorityFilter"
              :options="priorityOptions"
              label="Priority"
              placeholder="Priority"
            />
            <!-- Date range -->
            <div class="flex items-center gap-1">
              <input
                v-model="dueDateFrom"
                type="date"
                class="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                title="Due date from"
              />
              <span class="text-gray-400">-</span>
              <input
                v-model="dueDateTo"
                type="date"
                class="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                title="Due date to"
              />
            </div>
            <button
              v-if="hasActiveFilters"
              class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Reset to All Open"
              @click="clearFilters"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <!-- View toggle -->
          <div class="flex border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              class="px-3 py-1.5 text-sm font-medium transition-colors"
              :class="viewMode === 'list' ? 'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300' : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'"
              @click="viewMode = 'list'"
            >
              List
            </button>
            <button
              class="px-3 py-1.5 text-sm font-medium transition-colors"
              :class="viewMode === 'board' ? 'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300' : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'"
              @click="viewMode = 'board'"
            >
              Board
            </button>
          </div>

        </div>
      </template>
    </LayoutHeader>

    <div class="p-6">
      <!-- Error state -->
      <div v-if="projectError" class="text-center py-12">
        <p class="text-gray-500 dark:text-gray-400 mb-4">Project not found</p>
        <NuxtLink to="/projects" class="text-primary-600 dark:text-primary-400 hover:underline">
          Back to Projects
        </NuxtLink>
      </div>

      <!-- Board View -->
      <TasksTaskBoard
        v-else-if="viewMode === 'board'"
        :tasks="tasks"
        :loading="tasksLoading"
        :project-id="projectId"
        :project-code="project?.code"
        @select="navigateToTask"
        @update-status="handleUpdateStatus"
        @task-created="loadTasks"
      />

      <!-- List View (Table) -->
      <TasksTaskTable
        v-else
        :tasks="tasks"
        :loading="tasksLoading"
        :project-id="projectId"
        :project-code="project?.code"
        @select="navigateToTask"
        @update-status="handleUpdateStatus"
        @update-priority="handleUpdatePriority"
        @update-due-date="handleUpdateDueDate"
        @task-created="loadTasks"
        @move-task="handleMoveTask"
        @context-menu="handleContextMenu"
      />
    </div>

    <!-- Task Context Menu -->
    <TasksTaskContextMenu
      :task="contextMenuTask"
      :x="contextMenuPosition.x"
      :y="contextMenuPosition.y"
      :visible="showContextMenu"
      @close="closeContextMenu"
      @move-to-project="handleMoveToProjectClick"
      @delete="handleDeleteTask"
    />

    <!-- Move to Project Modal -->
    <TasksMoveToProjectModal
      :open="showMoveModal"
      :task="taskToMove"
      :current-project-id="projectId"
      @close="showMoveModal = false; taskToMove = null"
      @move="handleMoveToProject"
    />

    <!-- Create Task Modal -->
    <UiModal
      :open="showCreateModal"
      :title="parentTaskForCreate ? 'Create Subtask' : 'Create Task'"
      @close="showCreateModal = false; parentTaskForCreate = null"
    >
      <TasksTaskForm
        :parent-task="parentTaskForCreate || undefined"
        :loading="saving"
        @submit="handleCreateTask"
        @cancel="showCreateModal = false; parentTaskForCreate = null"
      />
    </UiModal>
  </div>
</template>
