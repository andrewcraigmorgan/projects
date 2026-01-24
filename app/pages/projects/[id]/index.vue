<script setup lang="ts">
import { useApi } from '~/composables/useApi'
import { useTasks, type Task } from '~/composables/useTasks'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const { fetchApi } = useApi()
const { isMobile } = useBreakpoints()

const projectId = computed(() => route.params.id as string)

// Project data
const project = ref<{
  id: string
  code: string
  name: string
  description: string
  status: string
  organization: string
  members?: Array<{ _id: string; name: string; email: string; avatar?: string }>
} | null>(null)

const projectLoading = ref(true)
const projectError = ref(false)

// Current parent task for hierarchical navigation
const currentParentId = computed(() => route.query.parent as string | undefined)

// Breadcrumb trail (array of ancestor tasks)
const breadcrumbs = ref<Array<{ id: string; title: string; taskNumber: number }>>([])
const currentParentTask = ref<Task | null>(null)
const loadingBreadcrumbs = ref(false)

// Inline description editing for parent task
const isEditingDescription = ref(false)
const editedDescription = ref('')
const savingDescription = ref(false)

// Organization members for assignee selection
const organizationMembers = ref<Array<{ id: string; name: string; email: string; avatar?: string }>>([])

// Mobile filter drawer state
const showMobileFilters = ref(false)

// Description editing functions
function startEditingDescription() {
  if (!currentParentTask.value) return
  // Keep HTML for rich text editing
  editedDescription.value = currentParentTask.value.description || ''
  isEditingDescription.value = true
}

function cancelEditingDescription() {
  isEditingDescription.value = false
  editedDescription.value = ''
}

async function saveDescription() {
  if (!currentParentTask.value) return

  savingDescription.value = true
  try {
    await updateTask(currentParentTask.value.id, { description: editedDescription.value })
    // Update local state
    currentParentTask.value = {
      ...currentParentTask.value,
      description: editedDescription.value,
    }
    isEditingDescription.value = false
  } catch (error) {
    console.error('Failed to save description:', error)
  } finally {
    savingDescription.value = false
  }
}

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

// Handle task selection - either drill down or go to detail
function handleTaskSelect(task: Task) {
  if (task.subtaskCount > 0) {
    navigateToSubtasks(task)
  } else {
    navigateToTask(task)
  }
}

// Get short task ID
function getShortId(task: { id: string; taskNumber?: number }) {
  const prefix = project.value?.code || task.id.slice(0, 3).toUpperCase()
  return `${prefix}-T${task.taskNumber ?? 0}`
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

      // Also fetch organization members for assignee selection
      if (response.data.project?.organization) {
        try {
          const orgResponse = await fetchApi<{
            success: boolean
            data: {
              organization: {
                members: Array<{ user: { _id: string; name: string; email: string; avatar?: string }; role: string }>
                owner: { _id: string; name: string; email: string; avatar?: string }
              }
            }
          }>(`/api/organizations/${response.data.project.organization}`)

          if (orgResponse.success) {
            const members: Array<{ id: string; name: string; email: string; avatar?: string }> = []
            // Add owner
            if (orgResponse.data.organization.owner) {
              members.push({
                id: orgResponse.data.organization.owner._id,
                name: orgResponse.data.organization.owner.name,
                email: orgResponse.data.organization.owner.email,
                avatar: orgResponse.data.organization.owner.avatar,
              })
            }
            // Add members
            for (const m of orgResponse.data.organization.members || []) {
              if (m.user && !members.find(existing => existing.id === m.user._id)) {
                members.push({
                  id: m.user._id,
                  name: m.user.name,
                  email: m.user.email,
                  avatar: m.user.avatar,
                })
              }
            }
            organizationMembers.value = members
          }
        } catch {
          // Silently fail - assignee selection will just be empty
        }
      }
    } else {
      projectError.value = true
    }
  } catch {
    projectError.value = true
  } finally {
    projectLoading.value = false
  }
}

// Load tasks (either root or children of current parent)
async function loadTasks() {
  if (currentParentId.value) {
    // Load children of the current parent task
    await fetchTasks({
      parentTask: currentParentId.value,
      status: statusFilter.value.length > 0 ? statusFilter.value : undefined,
      priority: priorityFilter.value.length > 0 ? priorityFilter.value : undefined,
      dueDateFrom: dueDateFrom.value || undefined,
      dueDateTo: dueDateTo.value || undefined,
    })
  } else {
    // Load root tasks
    await fetchTasks({
      rootOnly: true,
      status: statusFilter.value.length > 0 ? statusFilter.value : undefined,
      priority: priorityFilter.value.length > 0 ? priorityFilter.value : undefined,
      dueDateFrom: dueDateFrom.value || undefined,
      dueDateTo: dueDateTo.value || undefined,
    })
  }
}

// Load breadcrumbs for hierarchical navigation
async function loadBreadcrumbs() {
  if (!currentParentId.value) {
    breadcrumbs.value = []
    currentParentTask.value = null
    return
  }

  loadingBreadcrumbs.value = true
  try {
    // Fetch the current parent task with its path info
    const response = await fetchApi<{
      success: boolean
      data: { task: Task; ancestors?: Array<{ id: string; title: string; taskNumber: number }> }
    }>(`/api/tasks/${currentParentId.value}?includeAncestors=true`)

    if (response.success) {
      currentParentTask.value = response.data.task
      breadcrumbs.value = response.data.ancestors || []
    }
  } catch {
    // If we can't load breadcrumbs, navigate back to root
    router.replace({ query: { ...route.query, parent: undefined } })
  } finally {
    loadingBreadcrumbs.value = false
  }
}

// Navigate into a task's subtasks
function navigateToSubtasks(task: Task) {
  if (task.subtaskCount > 0) {
    router.push({
      query: { ...route.query, parent: task.id }
    })
  } else {
    // No subtasks, go to detail page
    navigateToTask(task)
  }
}

// Navigate up to a parent level
function navigateToParent(parentId: string | null) {
  if (parentId) {
    router.push({
      query: { ...route.query, parent: parentId }
    })
  } else {
    // Go to root
    const { parent, ...rest } = route.query
    router.push({ query: rest })
  }
}

// Watch for parent changes to reload data
watch(currentParentId, async () => {
  await Promise.all([loadTasks(), loadBreadcrumbs()])
})

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

// Handle task assignee update
async function handleUpdateAssignee(task: Task, assigneeId: string | null) {
  await updateTask(task.id, { assignee: assigneeId })
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
    await Promise.all([loadTasks(), loadBreadcrumbs()])
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
        <div v-else class="min-w-0">
          <h1 class="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 truncate">
            {{ project?.name }}
          </h1>
          <p v-if="project?.description" class="text-sm text-gray-500 dark:text-gray-400 mt-1 hidden sm:block truncate">
            {{ project.description }}
          </p>
        </div>
      </template>
      <template #actions>
        <div class="flex items-center gap-2 sm:gap-3">
          <!-- Milestones link - hidden on small mobile -->
          <NuxtLink
            :to="`/projects/${projectId}/milestones`"
            class="hidden sm:block px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
          >
            Milestones
          </NuxtLink>

          <!-- Mobile: Filter toggle button -->
          <button
            class="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
            :class="{ 'text-primary-600 dark:text-primary-400': hasActiveFilters }"
            @click="showMobileFilters = !showMobileFilters"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <!-- Active filter indicator -->
            <span
              v-if="hasActiveFilters"
              class="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full"
            />
          </button>

          <!-- Desktop: Filters inline -->
          <div class="hidden lg:flex items-center gap-2">
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

          <!-- View toggle - icon only on mobile -->
          <div class="flex border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              class="p-2 sm:px-3 sm:py-1.5 text-sm font-medium transition-colors"
              :class="viewMode === 'list' ? 'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300' : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'"
              title="List view"
              @click="viewMode = 'list'"
            >
              <svg class="h-5 w-5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span class="hidden sm:inline">List</span>
            </button>
            <button
              class="p-2 sm:px-3 sm:py-1.5 text-sm font-medium transition-colors"
              :class="viewMode === 'board' ? 'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300' : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'"
              title="Board view"
              @click="viewMode = 'board'"
            >
              <svg class="h-5 w-5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              <span class="hidden sm:inline">Board</span>
            </button>
          </div>

        </div>
      </template>
    </LayoutHeader>

    <!-- Mobile Filter Drawer -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-96 opacity-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="max-h-96 opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div
        v-if="showMobileFilters && isMobile"
        class="lg:hidden bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div class="p-4 space-y-4">
          <!-- Preset selector -->
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Quick Filter</label>
            <select
              :value="currentPreset"
              class="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500 focus:outline-none"
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
          </div>

          <!-- Status & Priority filters -->
          <div class="flex gap-3">
            <div class="flex-1">
              <UiFilterDropdown
                v-model="statusFilter"
                :options="statusOptions"
                label="Status"
                placeholder="Status"
              />
            </div>
            <div class="flex-1">
              <UiFilterDropdown
                v-model="priorityFilter"
                :options="priorityOptions"
                label="Priority"
                placeholder="Priority"
              />
            </div>
          </div>

          <!-- Date range -->
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Due Date Range</label>
            <div class="flex items-center gap-2">
              <input
                v-model="dueDateFrom"
                type="date"
                class="flex-1 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                placeholder="From"
              />
              <span class="text-gray-400">-</span>
              <input
                v-model="dueDateTo"
                type="date"
                class="flex-1 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                placeholder="To"
              />
            </div>
          </div>

          <!-- Clear filters button -->
          <div class="flex justify-between items-center pt-2">
            <button
              v-if="hasActiveFilters"
              class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              @click="clearFilters"
            >
              Reset to All Open
            </button>
            <button
              class="ml-auto text-sm font-medium text-primary-600 dark:text-primary-400"
              @click="showMobileFilters = false"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <div class="p-4 sm:p-6">
      <!-- Error state -->
      <div v-if="projectError" class="text-center py-12">
        <p class="text-gray-500 dark:text-gray-400 mb-4">Project not found</p>
        <NuxtLink to="/projects" class="text-primary-600 dark:text-primary-400 hover:underline">
          Back to Projects
        </NuxtLink>
      </div>

      <template v-else>
        <!-- Breadcrumb Navigation -->
        <nav v-if="currentParentId" class="mb-4">
          <ol class="flex items-center gap-2 text-sm flex-wrap">
            <!-- Root link -->
            <li>
              <button
                class="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                @click="navigateToParent(null)"
              >
                All Tasks
              </button>
            </li>

            <!-- Ancestor tasks -->
            <template v-for="ancestor in breadcrumbs" :key="ancestor.id">
              <li class="text-gray-400 dark:text-gray-500">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </li>
              <li>
                <button
                  class="text-primary-600 dark:text-primary-400 hover:underline"
                  @click="navigateToParent(ancestor.id)"
                >
                  {{ getShortId(ancestor) }}: {{ ancestor.title }}
                </button>
              </li>
            </template>

            <!-- Current parent (not clickable) -->
            <li v-if="currentParentTask" class="text-gray-400 dark:text-gray-500">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li v-if="currentParentTask" class="text-gray-700 dark:text-gray-300 font-medium">
              {{ getShortId(currentParentTask) }}: {{ currentParentTask.title }}
            </li>
          </ol>
        </nav>

        <!-- Parent Task Header (when viewing subtasks) -->
        <div v-if="currentParentTask" class="mb-6 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                <span class="px-2 py-0.5 text-xs font-mono bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  {{ getShortId(currentParentTask) }}
                </span>
                <span
                  class="px-2 py-0.5 text-xs font-medium"
                  :class="{
                    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400': currentParentTask.status === 'todo',
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300': currentParentTask.status === 'awaiting_approval',
                    'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300': currentParentTask.status === 'open',
                    'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300': currentParentTask.status === 'in_review',
                    'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300': currentParentTask.status === 'done',
                  }"
                >
                  {{ statusOptions.find(s => s.value === currentParentTask?.status)?.label }}
                </span>
                <span
                  v-if="currentParentTask.priority"
                  class="px-2 py-0.5 text-xs font-medium"
                  :class="{
                    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400': currentParentTask.priority === 'low',
                    'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300': currentParentTask.priority === 'medium',
                    'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300': currentParentTask.priority === 'high',
                  }"
                >
                  {{ currentParentTask.priority }}
                </span>
              </div>
              <h2 class="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                {{ currentParentTask.title }}
              </h2>
              <!-- Description editing area -->
              <div class="mt-2">
                <template v-if="isEditingDescription">
                  <UiRichTextEditor
                    v-model="editedDescription"
                    placeholder="Add a description... (paste formatted content with images)"
                    class="min-h-[150px]"
                  />
                  <div class="mt-2 flex items-center gap-2">
                    <button
                      class="px-3 py-1.5 text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
                      :disabled="savingDescription"
                      @click="saveDescription"
                    >
                      {{ savingDescription ? 'Saving...' : 'Save' }}
                    </button>
                    <button
                      class="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                      :disabled="savingDescription"
                      @click="cancelEditingDescription"
                    >
                      Cancel
                    </button>
                  </div>
                </template>
                <template v-else>
                  <div
                    class="group cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-700 p-2 -m-2 transition-colors"
                    @click="startEditingDescription"
                  >
                    <div
                      v-if="currentParentTask.description"
                      class="text-sm text-gray-600 dark:text-gray-400 prose prose-sm dark:prose-invert max-w-none [&_img]:max-h-48 [&_img]:object-contain"
                      v-html="currentParentTask.description"
                    />
                    <p
                      v-else
                      class="text-sm text-gray-400 dark:text-gray-500 italic"
                    >
                      Click to add a description...
                    </p>
                    <span class="sr-only">Edit description</span>
                  </div>
                </template>
              </div>
            </div>
            <button
              class="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
              @click="navigateToTask(currentParentTask)"
            >
              <span class="hidden sm:inline">View Details</span>
              <svg class="h-5 w-5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div class="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {{ tasks.length }} subtask{{ tasks.length !== 1 ? 's' : '' }}
          </div>
        </div>

        <!-- Board View -->
        <TasksTaskBoard
          v-if="viewMode === 'board'"
          :tasks="tasks"
          :loading="tasksLoading"
          :project-id="projectId"
          :project-code="project?.code"
          @select="handleTaskSelect"
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
          :parent-task-id="currentParentId"
          :assignee-options="organizationMembers"
          @select="handleTaskSelect"
          @update-status="handleUpdateStatus"
          @update-priority="handleUpdatePriority"
          @update-due-date="handleUpdateDueDate"
          @update-assignee="handleUpdateAssignee"
          @task-created="loadTasks"
          @move-task="handleMoveTask"
          @context-menu="handleContextMenu"
        />
      </template>
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
