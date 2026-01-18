<script setup lang="ts">
import { useApi } from '~/composables/useApi'
import { useTasks, type Task } from '~/composables/useTasks'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const { fetchApi } = useApi()

const projectId = computed(() => route.params.id as string)

// Project data
const project = ref<{
  id: string
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
} = useTasks(projectId)

// View mode (persisted to localStorage)
const viewMode = ref<'list' | 'board'>('board')

onMounted(() => {
  const saved = localStorage.getItem('taskViewMode')
  if (saved === 'list' || saved === 'board') {
    viewMode.value = saved
  }
})

watch(viewMode, (value) => {
  localStorage.setItem('taskViewMode', value)
})

// Modals
const showCreateModal = ref(false)
const selectedTask = ref<Task | null>(null)
const parentTaskForCreate = ref<Task | null>(null)
const saving = ref(false)

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
  await fetchTasks({ rootOnly: true })
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

// Handle subtask creation
function openCreateSubtask(parentTask: Task) {
  parentTaskForCreate.value = parentTask
  showCreateModal.value = true
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

// Initial load
onMounted(async () => {
  await loadProject()
  await loadTasks()
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
        @select="selectedTask = $event"
        @update-status="handleUpdateStatus"
        @task-created="loadTasks"
      />

      <!-- List View -->
      <TasksTaskList
        v-else
        :tasks="tasks"
        :loading="tasksLoading"
        :project-id="projectId"
        @select="selectedTask = $event"
        @load-subtasks="handleLoadSubtasks"
        @task-created="loadTasks"
      />
    </div>

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

    <!-- Task Detail Modal -->
    <UiModal
      :open="!!selectedTask"
      :title="selectedTask?.title"
      @close="selectedTask = null"
    >
      <div v-if="selectedTask" class="space-y-4">
        <div>
          <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
          <p class="capitalize text-gray-900 dark:text-gray-100">{{ selectedTask.status.replace('_', ' ') }}</p>
        </div>

        <div>
          <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Priority</label>
          <p class="capitalize text-gray-900 dark:text-gray-100">{{ selectedTask.priority }}</p>
        </div>

        <div v-if="selectedTask.description">
          <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Description</label>
          <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ selectedTask.description }}</p>
        </div>

        <div v-if="selectedTask.dueDate">
          <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Due Date</label>
          <p class="text-gray-900 dark:text-gray-100">{{ new Date(selectedTask.dueDate).toLocaleDateString() }}</p>
        </div>

        <div v-if="selectedTask.assignee">
          <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Assignee</label>
          <p class="text-gray-900 dark:text-gray-100">{{ selectedTask.assignee.name }}</p>
        </div>

        <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
          <UiButton
            variant="secondary"
            @click="openCreateSubtask(selectedTask!); selectedTask = null"
          >
            Add Subtask
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>
