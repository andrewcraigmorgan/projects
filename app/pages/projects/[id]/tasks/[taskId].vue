<script setup lang="ts">
import { useApi } from '~/composables/useApi'
import { useTasks, type Task } from '~/composables/useTasks'
import { useTags, type Tag } from '~/composables/useTags'
import { useComments, type Comment } from '~/composables/useComments'
import { useAuthStore } from '~/stores/auth'

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

// Ancestors (for breadcrumb navigation when viewing a subtask)
const ancestors = ref<Array<{ id: string; title: string; taskNumber: number }>>([])

// Add subtask
const isAddingSubtask = ref(false)
const newSubtaskTitle = ref('')
const savingSubtask = ref(false)

// For useTasks composable (for updates)
const { updateTask, getTaskWithSubtasks, moveTask, createTask } = useTasks(projectId)

// Move to project modal
const showMoveModal = ref(false)

// Tags
const { tags: availableTags, fetchTags, createTag } = useTags(projectId)
const selectedTags = ref<Tag[]>([])

// Description editing
const isEditingDescription = ref(false)
const editedDescription = ref('')

// Comments
const authStore = useAuthStore()
const { comments, loading: loadingComments, fetchComments, addComment, updateComment, deleteComment } = useComments(taskId)
const isAddingComment = ref(false)
const newCommentContent = ref('')
const savingComment = ref(false)
const editingCommentId = ref<string | null>(null)
const editedCommentContent = ref('')
const showDeleteConfirm = ref<string | null>(null)

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
  const from = route.query.from as string
  const parent = route.query.parent as string

  const params = new URLSearchParams()
  if (from === 'list' || from === 'board') {
    params.set('view', from)
  }
  if (parent) {
    params.set('parent', parent)
  }

  const queryString = params.toString()
  if (queryString) {
    return `/projects/${projectId.value}?${queryString}`
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
    const result = await getTaskWithSubtasks(taskId.value)
    if (result) {
      task.value = result.task
      subtasks.value = result.task.subtasks || []
      ancestors.value = result.ancestors
    } else {
      error.value = true
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

// Subtask progress
const subtaskProgress = computed(() => {
  if (subtasks.value.length === 0) return { done: 0, total: 0, percent: 0 }
  const done = subtasks.value.filter(s => s.status === 'done').length
  return {
    done,
    total: subtasks.value.length,
    percent: Math.round((done / subtasks.value.length) * 100),
  }
})

// Add subtask
function startAddingSubtask() {
  newSubtaskTitle.value = ''
  isAddingSubtask.value = true
  nextTick(() => {
    const input = document.getElementById('new-subtask-input')
    input?.focus()
  })
}

async function handleAddSubtask() {
  const title = newSubtaskTitle.value.trim()
  if (!title) return
  savingSubtask.value = true
  try {
    const response = await createTask({
      title,
      parentTask: taskId.value,
    })
    if (response.success) {
      subtasks.value.push(response.data.task)
      newSubtaskTitle.value = ''
      // Keep the form open for quick multi-add
    }
  } finally {
    savingSubtask.value = false
  }
}

function cancelAddSubtask() {
  isAddingSubtask.value = false
  newSubtaskTitle.value = ''
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

// Comment handlers
function isCommentAuthor(comment: Comment) {
  return comment.author && authStore.user && comment.author._id === authStore.user.id
}

function startAddingComment() {
  newCommentContent.value = ''
  isAddingComment.value = true
}

function cancelAddComment() {
  isAddingComment.value = false
  newCommentContent.value = ''
}

async function handleAddComment() {
  if (!newCommentContent.value.trim()) return
  savingComment.value = true
  try {
    await addComment(newCommentContent.value)
    isAddingComment.value = false
    newCommentContent.value = ''
  } finally {
    savingComment.value = false
  }
}

function startEditingComment(comment: Comment) {
  editingCommentId.value = comment.id
  editedCommentContent.value = comment.content
}

function cancelEditComment() {
  editingCommentId.value = null
  editedCommentContent.value = ''
}

async function handleUpdateComment(commentId: string) {
  if (!editedCommentContent.value.trim()) return
  savingComment.value = true
  try {
    await updateComment(commentId, editedCommentContent.value)
    editingCommentId.value = null
    editedCommentContent.value = ''
  } finally {
    savingComment.value = false
  }
}

async function handleDeleteComment(commentId: string) {
  savingComment.value = true
  try {
    await deleteComment(commentId)
    showDeleteConfirm.value = null
  } finally {
    savingComment.value = false
  }
}

function formatCommentDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
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

// Move to project
async function handleMoveToProject(destinationProjectId: string) {
  if (!task.value) return

  try {
    const response = await moveTask(task.value.id, null, undefined, destinationProjectId)
    if (response.success) {
      // Navigate to the task in its new project
      showMoveModal.value = false
      router.push(`/projects/${destinationProjectId}/tasks/${task.value.id}`)
    }
  } catch (error) {
    console.error('Failed to move task:', error)
  }
}

// Set page title
useHead({
  title: computed(() => task.value ? `${shortId.value} - ${task.value.title}` : 'Task'),
})

// Initial load
onMounted(async () => {
  await Promise.all([loadProject(), loadTask(), fetchTags(), fetchComments()])
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
      <div v-else-if="loading" class="flex justify-center py-12">
        <UiLoadingSpinner size="lg" />
      </div>

      <!-- Task detail -->
      <div v-else-if="task" class="max-w-4xl">
        <!-- Parent task breadcrumb -->
        <nav v-if="ancestors.length > 0" class="mb-4 flex items-center gap-1.5 text-sm">
          <svg class="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          <span class="text-gray-400 dark:text-gray-500">Subtask of</span>
          <template v-for="(ancestor, index) in ancestors" :key="ancestor.id">
            <span v-if="index > 0" class="text-gray-300 dark:text-gray-600">/</span>
            <NuxtLink
              :to="`/projects/${projectId}/tasks/${ancestor.id}?from=${route.query.from || 'list'}`"
              class="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              <span class="font-mono text-xs text-gray-500 dark:text-gray-400">{{ project?.code || '' }}-T{{ ancestor.taskNumber }}</span>
              <span>{{ ancestor.title }}</span>
            </NuxtLink>
          </template>
        </nav>

        <UiCard>
          <!-- Status and Priority row -->
          <div class="flex flex-wrap gap-6 mb-6">
            <!-- Status -->
            <div>
              <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Status
              </label>
              <select
                :value="task.status"
                class="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:[color-scheme:dark]"
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
                class="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:[color-scheme:dark]"
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
                <UiAvatar
                  :name="task.assignee.name"
                  :role="task.assignee.role"
                  size="sm"
                />
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

          <!-- Subtasks Section -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <svg class="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Subtasks
                  <span v-if="subtasks.length > 0" class="text-gray-400 dark:text-gray-500 font-normal">
                    ({{ subtaskProgress.done }}/{{ subtaskProgress.total }})
                  </span>
                </h3>
              </div>
              <button
                v-if="!isAddingSubtask"
                type="button"
                class="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                @click="startAddingSubtask"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Add subtask
              </button>
            </div>

            <!-- Progress bar -->
            <div v-if="subtasks.length > 0" class="mb-4">
              <div class="w-full bg-gray-200 dark:bg-gray-700 h-1.5 overflow-hidden">
                <div
                  class="h-full bg-green-500 dark:bg-green-400 transition-all duration-300"
                  :style="{ width: `${subtaskProgress.percent}%` }"
                />
              </div>
            </div>

            <!-- Subtask list -->
            <div v-if="subtasks.length > 0" class="space-y-1">
              <NuxtLink
                v-for="subtask in subtasks"
                :key="subtask.id"
                :to="`/projects/${projectId}/tasks/${subtask.id}?from=${route.query.from || 'list'}`"
                class="group flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors"
              >
                <!-- Status checkbox icon -->
                <span class="shrink-0">
                  <svg
                    v-if="subtask.status === 'done'"
                    class="h-5 w-5 text-green-500"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <svg
                    v-else
                    class="h-5 w-5 text-gray-300 dark:text-gray-600"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <circle cx="12" cy="12" r="9" stroke-width="2" />
                  </svg>
                </span>

                <!-- Task ID -->
                <span class="text-xs font-mono text-gray-400 dark:text-gray-500 shrink-0">
                  {{ project?.code || '' }}-T{{ subtask.taskNumber ?? 0 }}
                </span>

                <!-- Title -->
                <span
                  class="flex-1 text-gray-900 dark:text-gray-100 truncate"
                  :class="{ 'line-through text-gray-400 dark:text-gray-500': subtask.status === 'done' }"
                >
                  {{ subtask.title }}
                </span>

                <!-- Priority badge -->
                <span
                  v-if="subtask.priority"
                  class="text-xs px-1.5 py-0.5 shrink-0"
                  :class="{
                    'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300': subtask.priority === 'low',
                    'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-300': subtask.priority === 'medium',
                    'bg-red-50 text-red-600 dark:bg-red-900/50 dark:text-red-300': subtask.priority === 'high',
                  }"
                >
                  {{ subtask.priority }}
                </span>

                <!-- Assignee avatar -->
                <UiAvatar
                  v-if="subtask.assignee"
                  :name="subtask.assignee.name"
                  size="xs"
                  class="shrink-0"
                />

                <!-- Status badge -->
                <span
                  class="text-xs px-1.5 py-0.5 shrink-0"
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

                <!-- Arrow -->
                <svg class="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </NuxtLink>
            </div>

            <!-- Empty state -->
            <div v-else-if="!isAddingSubtask" class="text-center py-6 bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600">
              <svg class="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p class="text-sm text-gray-400 dark:text-gray-500 mb-2">No subtasks yet</p>
              <button
                type="button"
                class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                @click="startAddingSubtask"
              >
                Add a subtask to break this down
              </button>
            </div>

            <!-- Add subtask form -->
            <div v-if="isAddingSubtask" class="mt-2 flex items-center gap-2">
              <input
                id="new-subtask-input"
                v-model="newSubtaskTitle"
                type="text"
                placeholder="Subtask title..."
                class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                :disabled="savingSubtask"
                @keyup.enter="handleAddSubtask"
                @keyup.escape="cancelAddSubtask"
              />
              <button
                type="button"
                class="px-3 py-2 text-sm bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                :disabled="savingSubtask || !newSubtaskTitle.trim()"
                @click="handleAddSubtask"
              >
                {{ savingSubtask ? 'Adding...' : 'Add' }}
              </button>
              <button
                type="button"
                class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                @click="cancelAddSubtask"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- Comments -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                Comments ({{ comments.length }})
              </h3>
              <button
                v-if="!isAddingComment"
                type="button"
                class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                @click="startAddingComment"
              >
                Add comment
              </button>
            </div>

            <!-- Loading comments -->
            <div v-if="loadingComments" class="flex justify-center py-4">
              <UiLoadingSpinner size="sm" />
            </div>

            <!-- Comments list -->
            <div v-else class="space-y-4">
              <div
                v-for="comment in comments"
                :key="comment.id"
                class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4"
              >
                <!-- Comment header -->
                <div class="flex items-start justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <UiAvatar
                      :name="comment.author?.name || comment.authorName || 'Unknown'"
                      size="sm"
                    />
                    <div>
                      <span class="font-medium text-gray-900 dark:text-gray-100">
                        {{ comment.author?.name || comment.authorName || 'Unknown' }}
                      </span>
                      <span class="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        {{ formatCommentDate(comment.createdAt) }}
                      </span>
                      <span
                        v-if="comment.updatedAt !== comment.createdAt"
                        class="text-xs text-gray-400 dark:text-gray-500 ml-1"
                      >
                        (edited)
                      </span>
                    </div>
                  </div>

                  <!-- Edit/Delete buttons for author -->
                  <div v-if="isCommentAuthor(comment) && editingCommentId !== comment.id" class="flex items-center gap-2">
                    <button
                      type="button"
                      class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      @click="startEditingComment(comment)"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      class="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400"
                      @click="showDeleteConfirm = comment.id"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <!-- Delete confirmation -->
                <div
                  v-if="showDeleteConfirm === comment.id"
                  class="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                >
                  <p class="text-sm text-red-700 dark:text-red-300 mb-2">
                    Are you sure you want to delete this comment?
                  </p>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      class="px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      :disabled="savingComment"
                      @click="handleDeleteComment(comment.id)"
                    >
                      {{ savingComment ? 'Deleting...' : 'Delete' }}
                    </button>
                    <button
                      type="button"
                      class="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                      @click="showDeleteConfirm = null"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                <!-- Comment content (editing) -->
                <div v-if="editingCommentId === comment.id">
                  <UiRichTextEditor
                    v-model="editedCommentContent"
                    placeholder="Edit your comment..."
                  />
                  <div class="flex justify-end gap-2 mt-3">
                    <button
                      type="button"
                      class="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                      @click="cancelEditComment"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      class="px-3 py-1.5 text-sm bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                      :disabled="savingComment || !editedCommentContent.trim()"
                      @click="handleUpdateComment(comment.id)"
                    >
                      {{ savingComment ? 'Saving...' : 'Save' }}
                    </button>
                  </div>
                </div>

                <!-- Comment content (display) -->
                <div
                  v-else
                  class="prose dark:prose-invert max-w-none text-sm"
                  v-html="comment.content"
                />
              </div>

              <!-- Empty state -->
              <p
                v-if="comments.length === 0 && !isAddingComment"
                class="text-gray-400 dark:text-gray-500 italic text-center py-4"
              >
                No comments yet. Click "Add comment" to start a discussion.
              </p>

              <!-- Add comment form -->
              <div v-if="isAddingComment" class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4">
                <UiRichTextEditor
                  v-model="newCommentContent"
                  placeholder="Write a comment... You can use formatting, add images, and more."
                />
                <div class="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    class="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    @click="cancelAddComment"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    class="px-3 py-1.5 text-sm bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                    :disabled="savingComment || !newCommentContent.trim()"
                    @click="handleAddComment"
                  >
                    {{ savingComment ? 'Posting...' : 'Post Comment' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                @click="showMoveModal = true"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Move to Project
              </button>
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
        </UiCard>
      </div>
    </div>

    <!-- Move to Project Modal -->
    <TasksMoveToProjectModal
      :open="showMoveModal"
      :task="task"
      :current-project-id="projectId"
      @close="showMoveModal = false"
      @move="handleMoveToProject"
    />
  </div>
</template>
