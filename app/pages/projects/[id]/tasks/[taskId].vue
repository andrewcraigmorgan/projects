<script setup lang="ts">
import { useApi } from '~/composables/useApi'
import { useTasks, type Task } from '~/composables/useTasks'
import { useTags, type Tag } from '~/composables/useTags'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const { fetchApi } = useApi()

const projectId = computed(() => route.params.id as string)
const taskId = computed(() => route.params.taskId as string)

// Project data
const project = ref<{
  id: string
  code: string
  name: string
  description: string
  status: string
} | null>(null)

// Task data
const task = ref<Task | null>(null)
const loading = ref(true)
const error = ref(false)
const saving = ref(false)

// Subtasks
const subtasks = ref<Task[]>([])
const loadingSubtasks = ref(false)

// For useTasks composable (for updates)
const { updateTask, getTaskWithSubtasks } = useTasks(projectId)

// Tags
const { tags: availableTags, fetchTags, createTag } = useTags(projectId)
const selectedTags = ref<Tag[]>([])

// Description editing
const isEditingDescription = ref(false)
const editedDescription = ref('')

// Computed short ID
const shortId = computed(() => {
  if (!task.value) return ''
  const prefix = project.value?.code || task.value.id.slice(0, 3).toUpperCase()
  return `${prefix}-T${task.value.taskNumber ?? 0}`
})

// Status options
const statusOptions = [
  { value: 'todo', label: 'To Do' },
  { value: 'awaiting_approval', label: 'Awaiting Approval' },
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
]

// Priority options
const priorityOptions = [
  { value: '', label: 'No Priority' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

// Back navigation
const backUrl = computed(() => {
  // Check if there's a referrer in query params
  const from = route.query.from as string
  if (from === 'list' || from === 'board') {
    return `/projects/${projectId.value}?view=${from}`
  }
  return `/projects/${projectId.value}`
})

// Fetch project
async function loadProject() {
  try {
    const response = await fetchApi<{
      success: boolean
      data: { project: typeof project.value }
    }>(`/api/projects/${projectId.value}`)

    if (response.success) {
      project.value = response.data.project
    }
  } catch {
    // Project load error is not critical
  }
}

// Fetch task
async function loadTask() {
  loading.value = true
  error.value = false

  try {
    const fullTask = await getTaskWithSubtasks(taskId.value)
    if (fullTask) {
      task.value = fullTask
      subtasks.value = fullTask.subtasks || []
    } else {
      error.value = true
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

// Update handlers
async function handleStatusChange(event: Event) {
  if (!task.value) return
  const target = event.target as HTMLSelectElement
  saving.value = true
  try {
    const response = await updateTask(task.value.id, { status: target.value as Task['status'] })
    if (response.success) {
      task.value = { ...task.value, status: target.value as Task['status'] }
    }
  } finally {
    saving.value = false
  }
}

async function handlePriorityChange(event: Event) {
  if (!task.value) return
  const target = event.target as HTMLSelectElement
  const value = target.value || undefined
  saving.value = true
  try {
    const response = await updateTask(task.value.id, { priority: value as Task['priority'] })
    if (response.success) {
      task.value = { ...task.value, priority: value as Task['priority'] }
    }
  } finally {
    saving.value = false
  }
}

// Description editing
function startEditingDescription() {
  editedDescription.value = task.value?.description || ''
  isEditingDescription.value = true
}

async function saveDescription() {
  if (!task.value) return
  saving.value = true
  try {
    const response = await updateTask(task.value.id, { description: editedDescription.value } as any)
    if (response.success) {
      task.value = { ...task.value, description: editedDescription.value }
    }
  } finally {
    saving.value = false
    isEditingDescription.value = false
  }
}

function cancelEditDescription() {
  isEditingDescription.value = false
  editedDescription.value = ''
}

// Tag handling
async function handleTagsChange(tags: Tag[]) {
  if (!task.value) return
  selectedTags.value = tags
  saving.value = true
  try {
    const tagIds = tags.map(t => t.id)
    await updateTask(task.value.id, { tags: tagIds } as any)
    task.value = { ...task.value, tags }
  } finally {
    saving.value = false
  }
}

async function handleCreateTag(name: string) {
  const response = await createTag(name)
  if (response.success) {
    // Add the new tag to selected tags
    const newTag = response.data.tag
    handleTagsChange([...selectedTags.value, newTag])
  }
}

// Copy ID
const copied = ref(false)
async function copyId() {
  try {
    await navigator.clipboard.writeText(shortId.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch {
    // Fallback
    const textArea = document.createElement('textarea')
    textArea.value = shortId.value
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  }
}

// Set page title
useHead({
  title: computed(() => task.value ? `${shortId.value} - ${task.value.title}` : 'Task'),
})

// Initial load
onMounted(async () => {
  await Promise.all([loadProject(), loadTask(), fetchTags()])
  // Initialize selected tags from task
  if (task.value?.tags) {
    selectedTags.value = task.value.tags
  }
})
</script>

<template>
  <div>
    <LayoutHeader :back-link="backUrl">
      <template #title>
        <div v-if="loading" class="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div v-else-if="task">
          <div class="flex items-center gap-3">
            <button
              class="px-2 py-1 text-sm font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
              :title="copied ? 'Copied!' : 'Click to copy'"
              @click="copyId"
            >
              <span v-if="copied" class="text-green-600 dark:text-green-400">Copied!</span>
              <span v-else>{{ shortId }}</span>
            </button>
            <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {{ task.title }}
            </h1>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ project?.name }}
          </p>
        </div>
      </template>
    </LayoutHeader>

    <div class="p-6">
      <!-- Error state -->
      <div v-if="error" class="text-center py-12">
        <p class="text-gray-500 dark:text-gray-400 mb-4">Task not found</p>
        <NuxtLink :to="backUrl" class="text-primary-600 dark:text-primary-400 hover:underline">
          Back to Project
        </NuxtLink>
      </div>

      <!-- Loading state -->
      <div v-else-if="loading" class="space-y-4">
        <div class="h-20 bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div class="h-40 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>

      <!-- Task detail -->
      <div v-else-if="task" class="max-w-4xl">
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
          <!-- Status and Priority row -->
          <div class="flex flex-wrap gap-6 mb-6">
            <!-- Status -->
            <div>
              <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Status
              </label>
              <select
                :value="task.status"
                class="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                :disabled="saving"
                @change="handleStatusChange"
              >
                <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>

            <!-- Priority -->
            <div>
              <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Priority
              </label>
              <select
                :value="task.priority || ''"
                class="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                :disabled="saving"
                @change="handlePriorityChange"
              >
                <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>

            <!-- Due Date -->
            <div v-if="task.dueDate">
              <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Due Date
              </label>
              <p class="px-3 py-2 text-gray-900 dark:text-gray-100">
                {{ new Date(task.dueDate).toLocaleDateString() }}
              </p>
            </div>

            <!-- Assignee -->
            <div v-if="task.assignee">
              <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Assignee
              </label>
              <div class="flex items-center gap-2 px-3 py-2">
                <div
                  class="h-6 w-6 flex items-center justify-center text-xs font-medium"
                  :class="task.assignee.role === 'client'
                    ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                    : 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'"
                >
                  {{ task.assignee.name[0]?.toUpperCase() }}
                </div>
                <span class="text-gray-900 dark:text-gray-100">{{ task.assignee.name }}</span>
                <span
                  v-if="task.assignee.role"
                  class="text-xs px-1 py-0.5"
                  :class="task.assignee.role === 'client'
                    ? 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'"
                >
                  {{ task.assignee.role === 'client' ? 'Client' : 'Team' }}
                </span>
              </div>
            </div>

            <!-- Estimated Hours -->
            <div v-if="task.estimatedHours">
              <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Estimated Hours
              </label>
              <p class="px-3 py-2 text-gray-900 dark:text-gray-100">
                {{ task.estimatedHours }}h
              </p>
            </div>

            <!-- Milestone -->
            <div v-if="task.milestone">
              <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Milestone
              </label>
              <p class="px-3 py-2 text-indigo-700 dark:text-indigo-300">
                {{ task.milestone.name }}
              </p>
            </div>
          </div>

          <!-- Tags -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Tags
            </label>
            <UiTagSelector
              v-model="selectedTags"
              :available-tags="availableTags"
              :can-create-tags="true"
              @create-tag="handleCreateTag"
            />
          </div>

          <!-- External badge -->
          <div v-if="task.isExternal" class="mb-4">
            <span class="inline-flex items-center px-2 py-1 text-sm font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              External Task
            </span>
          </div>

          <!-- Description -->
          <div class="mb-6">
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">
                Description
              </label>
              <button
                v-if="!isEditingDescription"
                type="button"
                class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                @click="startEditingDescription"
              >
                {{ task.description ? 'Edit' : 'Add description' }}
              </button>
            </div>

            <!-- Rich text editor for editing -->
            <div v-if="isEditingDescription">
              <UiRichTextEditor
                v-model="editedDescription"
                placeholder="Add a description... You can use formatting, add images, and more."
              />
              <div class="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  class="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  @click="cancelEditDescription"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 text-sm bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                  :disabled="saving"
                  @click="saveDescription"
                >
                  {{ saving ? 'Saving...' : 'Save' }}
                </button>
              </div>
            </div>

            <!-- Rendered description -->
            <div v-else-if="task.description" class="prose dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700" v-html="task.description" />

            <!-- Empty state -->
            <p v-else class="text-gray-400 dark:text-gray-500 italic">
              No description yet. Click "Add description" to add one.
            </p>
          </div>

          <!-- Subtasks -->
          <div v-if="subtasks.length > 0" class="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              Subtasks ({{ subtasks.length }})
            </h3>
            <div class="space-y-2">
              <NuxtLink
                v-for="subtask in subtasks"
                :key="subtask.id"
                :to="`/projects/${projectId}/tasks/${subtask.id}?from=${route.query.from || 'list'}`"
                class="block p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <span class="text-xs font-mono text-gray-500 dark:text-gray-400">
                    {{ project?.code || subtask.id.slice(0, 3).toUpperCase() }}-T{{ subtask.taskNumber ?? 0 }}
                  </span>
                  <span class="text-gray-900 dark:text-gray-100">{{ subtask.title }}</span>
                  <span
                    class="text-xs px-1.5 py-0.5"
                    :class="{
                      'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300': subtask.status === 'todo',
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300': subtask.status === 'awaiting_approval',
                      'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300': subtask.status === 'open',
                      'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300': subtask.status === 'in_review',
                      'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300': subtask.status === 'done',
                    }"
                  >
                    {{ statusOptions.find(s => s.value === subtask.status)?.label }}
                  </span>
                </div>
              </NuxtLink>
            </div>
          </div>

          <!-- Metadata -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
            <div class="flex flex-wrap gap-6 text-sm text-gray-500 dark:text-gray-400">
              <div v-if="task.createdBy">
                Created by {{ task.createdBy.name }}
              </div>
              <div>
                Created {{ new Date(task.createdAt).toLocaleDateString() }}
              </div>
              <div>
                Updated {{ new Date(task.updatedAt).toLocaleDateString() }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
