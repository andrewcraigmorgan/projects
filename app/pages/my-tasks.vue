<script setup lang="ts">
import { useMyTasks } from '~/composables/useMyTasks'
import { useProjects, type Project } from '~/composables/useProjects'
import { useOrganizationStore } from '~/stores/organization'
import type { Task } from '~/composables/useTasks'

definePageMeta({
  layout: 'default',
})

const router = useRouter()
const route = useRoute()
const orgStore = useOrganizationStore()
const { isMobile } = useBreakpoints()

// Tasks
const {
  tasks,
  loading: tasksLoading,
  fetchTasks,
  updateTask,
  // Pagination
  page: tasksPage,
  totalPages: tasksTotalPages,
  total: tasksTotal,
  limit: tasksLimit,
  setPage: setTasksPage,
  resetPagination: resetTasksPagination,
} = useMyTasks()

// Projects for filter dropdown
const { projects, fetchProjects } = useProjects()

// View mode (from URL param, then localStorage, then default to 'list')
const viewMode = ref<'list' | 'board'>('list')

// Filters
const statusFilter = ref<string[]>([])
const priorityFilter = ref<string[]>([])
const projectFilter = ref<string>('')
const dueDateFrom = ref<string>('')
const dueDateTo = ref<string>('')

// Mobile filter drawer state
const showMobileFilters = ref(false)

const statusOptions = [
  { value: 'todo', label: 'To Do', color: 'bg-blue-400' },
  { value: 'awaiting_approval', label: 'Awaiting', color: 'bg-orange-400' },
  { value: 'open', label: 'Open', color: 'bg-green-400' },
  { value: 'in_review', label: 'In Review', color: 'bg-yellow-400' },
  { value: 'done', label: 'Done', color: 'bg-gray-400' },
]

const priorityOptions = [
  { value: 'high', label: 'High', color: 'bg-orange-400' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-400' },
  { value: 'low', label: 'Low', color: 'bg-gray-400' },
]

// Project options for dropdown
const projectOptions = computed(() => [
  { value: '', label: 'All Projects' },
  ...projects.value.map(p => ({ value: p.id, label: p.name }))
])

// Default "All Open" status filter (excludes 'done')
const defaultOpenStatuses = ['todo', 'awaiting_approval', 'open', 'in_review']

// Preset views
const presets = [
  { name: 'All Open', statuses: defaultOpenStatuses, priorities: [], dueDateFrom: '', dueDateTo: '' },
  { name: 'All Tasks', statuses: [], priorities: [], dueDateFrom: '', dueDateTo: '' },
  { name: 'High Priority', statuses: defaultOpenStatuses, priorities: ['high'], dueDateFrom: '', dueDateTo: '' },
  { name: 'Due This Week', statuses: defaultOpenStatuses, priorities: [], dueDateFrom: getToday(), dueDateTo: getEndOfWeek() },
]

function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function getEndOfWeek(): string {
  const today = new Date()
  const daysUntilSunday = 7 - today.getDay()
  const endOfWeek = new Date(today)
  endOfWeek.setDate(today.getDate() + daysUntilSunday)
  return endOfWeek.toISOString().slice(0, 10)
}

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
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
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
  const hasNoOtherFilters = priorityFilter.value.length === 0 && !projectFilter.value && !dueDateFrom.value && !dueDateTo.value
  return !(isDefault && hasNoOtherFilters)
})

// Clear all filters (reset to "All Open")
function clearFilters() {
  statusFilter.value = [...defaultOpenStatuses]
  priorityFilter.value = []
  projectFilter.value = ''
  dueDateFrom.value = ''
  dueDateTo.value = ''
}

// Initialize filters from URL
onMounted(() => {
  const urlView = route.query.view as string
  const urlStatus = route.query.status as string
  const urlPriority = route.query.priority as string
  const urlProject = route.query.project as string
  const urlDueDateFrom = route.query.dueDateFrom as string
  const urlDueDateTo = route.query.dueDateTo as string
  const urlPage = route.query.page as string

  if (urlView === 'list' || urlView === 'board') {
    viewMode.value = urlView
  } else {
    const saved = localStorage.getItem('myTasksViewMode')
    if (saved === 'list' || saved === 'board') {
      viewMode.value = saved
    }
  }

  // Initialize page from URL
  if (urlPage) {
    const pageNum = parseInt(urlPage, 10)
    if (!isNaN(pageNum) && pageNum >= 1) {
      tasksPage.value = pageNum
    }
  }

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
  if (urlProject) {
    projectFilter.value = urlProject
    hasUrlFilters = true
  }
  if (urlDueDateFrom) {
    dueDateFrom.value = urlDueDateFrom
    hasUrlFilters = true
  }
  if (urlDueDateTo) {
    dueDateTo.value = urlDueDateTo
    hasUrlFilters = true
  }

  // Apply default "All Open" preset if no URL filters
  if (!hasUrlFilters) {
    statusFilter.value = [...defaultOpenStatuses]
  }
})

watch(viewMode, (value) => {
  localStorage.setItem('myTasksViewMode', value)
  updateUrlParams()
})

// Update URL when filters change - reset to page 1
watch([statusFilter, priorityFilter, projectFilter, dueDateFrom, dueDateTo], () => {
  resetTasksPagination()
  updateUrlParams()
  loadTasks()
}, { deep: true })

function updateUrlParams() {
  const query: Record<string, string> = {}
  if (viewMode.value !== 'list') query.view = viewMode.value
  if (statusFilter.value.length > 0) query.status = statusFilter.value.join(',')
  if (priorityFilter.value.length > 0) query.priority = priorityFilter.value.join(',')
  if (projectFilter.value) query.project = projectFilter.value
  if (dueDateFrom.value) query.dueDateFrom = dueDateFrom.value
  if (dueDateTo.value) query.dueDateTo = dueDateTo.value
  if (tasksPage.value > 1) query.page = String(tasksPage.value)
  router.replace({ query })
}

// Handle page change
async function handlePageChange(newPage: number) {
  await setTasksPage(newPage)
  updateUrlParams()
}

// Navigate to task detail page
function navigateToTask(task: Task) {
  if (task.project) {
    router.push(`/projects/${task.project.id}/tasks/${task.id}?from=my-tasks`)
  }
}

// Handle task status update
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

// Handle task assignees update
async function handleUpdateAssignees(task: Task, assigneeIds: string[]) {
  await updateTask(task.id, { assignees: assigneeIds })
  await loadTasks()
}

// Load tasks
async function loadTasks() {
  await fetchTasks({
    status: statusFilter.value.length > 0 ? statusFilter.value : undefined,
    priority: priorityFilter.value.length > 0 ? priorityFilter.value : undefined,
    projectId: projectFilter.value || undefined,
    dueDateFrom: dueDateFrom.value || undefined,
    dueDateTo: dueDateTo.value || undefined,
  })
}

// Initial load
watch(
  () => orgStore.currentOrganization,
  async () => {
    if (orgStore.currentOrganization) {
      await Promise.all([loadTasks(), fetchProjects()])
    }
  },
  { immediate: true }
)

// Set page title
useHead({
  title: 'My Tasks - Projects',
})
</script>

<template>
  <div>
    <LayoutHeader title="My Tasks">
      <template #actions>
        <div class="flex items-center gap-2 sm:gap-3">
          <!-- Mobile: Filter toggle button -->
          <button
            class="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
            :class="{ 'text-primary-600 dark:text-primary-400': hasActiveFilters }"
            @click="showMobileFilters = !showMobileFilters"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span
              v-if="hasActiveFilters"
              class="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full"
            />
          </button>

          <!-- View toggle -->
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

    <!-- Desktop Filter Bar -->
    <div class="hidden lg:block bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
      <div class="px-4 sm:px-6 py-3">
        <div class="flex items-center justify-between gap-4">
          <!-- Left side: Filter controls -->
          <div class="flex items-center gap-3 flex-wrap">
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Filters</span>

            <!-- Preset selector -->
            <select
              :value="currentPreset"
              class="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500 focus:outline-none font-medium dark:[color-scheme:dark]"
              @change="(e: Event) => {
                const preset = presets.find(p => p.name === (e.target as HTMLSelectElement).value)
                if (preset) applyPreset(preset)
              }"
            >
              <option v-for="preset in presets" :key="preset.name" :value="preset.name">
                {{ preset.name }}
              </option>
              <option v-if="currentPreset === 'Custom'" value="Custom">Custom</option>
            </select>

            <div class="h-4 w-px bg-gray-300 dark:bg-gray-600" />

            <UiSelect
              v-model="statusFilter"
              :options="statusOptions"
              multiple
              show-select-all
              label="Status"
              placeholder="Status"
            />
            <UiSelect
              v-model="priorityFilter"
              :options="priorityOptions"
              multiple
              show-select-all
              label="Priority"
              placeholder="Priority"
            />
            <UiSelect
              v-model="projectFilter"
              :options="projectOptions"
              searchable
              placeholder="All Projects"
            />

            <div class="h-4 w-px bg-gray-300 dark:bg-gray-600" />

            <!-- Date range with label -->
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 dark:text-gray-400">Due:</span>
              <input
                v-model="dueDateFrom"
                type="date"
                class="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:[color-scheme:dark]"
                title="Due date from"
              />
              <span class="text-gray-400">to</span>
              <input
                v-model="dueDateTo"
                type="date"
                class="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:[color-scheme:dark]"
                title="Due date to"
              />
            </div>
          </div>

          <!-- Right side: Reset button -->
          <button
            v-if="hasActiveFilters"
            class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title="Reset to All Open"
            @click="clearFilters"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>

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
              class="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:[color-scheme:dark]"
              @change="(e: Event) => {
                const preset = presets.find(p => p.name === (e.target as HTMLSelectElement).value)
                if (preset) applyPreset(preset)
              }"
            >
              <option v-for="preset in presets" :key="preset.name" :value="preset.name">
                {{ preset.name }}
              </option>
              <option v-if="currentPreset === 'Custom'" value="Custom">Custom</option>
            </select>
          </div>

          <!-- Project filter -->
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Project</label>
            <UiSelect
              v-model="projectFilter"
              :options="projectOptions"
              searchable
              placeholder="All Projects"
              size="md"
              variant="default"
            />
          </div>

          <!-- Status & Priority filters -->
          <div class="flex gap-3">
            <div class="flex-1">
              <UiSelect
                v-model="statusFilter"
                :options="statusOptions"
                multiple
                show-select-all
                label="Status"
                placeholder="Status"
              />
            </div>
            <div class="flex-1">
              <UiSelect
                v-model="priorityFilter"
                :options="priorityOptions"
                multiple
                show-select-all
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
      <!-- Loading -->
      <UiLoadingSpinner v-if="tasksLoading && tasks.length === 0" />

      <!-- Empty state -->
      <UiEmptyState
        v-else-if="tasks.length === 0"
        title="No tasks assigned to you"
        description="Tasks assigned to you will appear here."
      >
        <template #icon>
          <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </template>
      </UiEmptyState>

      <!-- Board View -->
      <TasksTaskBoard
        v-else-if="viewMode === 'board'"
        :tasks="tasks"
        :loading="tasksLoading"
        @select="navigateToTask"
        @update-status="handleUpdateStatus"
      />

      <!-- List View (Table) -->
      <TasksTaskTable
        v-else
        :tasks="tasks"
        :loading="tasksLoading"
        :enable-drag-drop="false"
        storage-key="myTasks"
        @select="navigateToTask"
        @update-status="handleUpdateStatus"
        @update-priority="handleUpdatePriority"
        @update-due-date="handleUpdateDueDate"
        @update-assignees="handleUpdateAssignees"
      />
    </div>
  </div>
</template>
