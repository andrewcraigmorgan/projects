<script setup lang="ts">
import type { Task } from '~/composables/useTasks'
import type { Project } from '~/composables/useProjects'
import { useApi } from '~/composables/useApi'
import { useOrganizationStore } from '~/stores/organization'

interface Props {
  open: boolean
  task: Task | null
  currentProjectId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'move', projectId: string): void
}>()

const { fetchApi } = useApi()
const orgStore = useOrganizationStore()

const projects = ref<Project[]>([])
const loading = ref(false)
const selectedProjectId = ref<string | null>(null)
const moving = ref(false)

// Compute fields that will be cleared
const fieldsToBeCleared = computed(() => {
  if (!props.task) return []
  const fields: string[] = []
  if (props.task.milestone) fields.push('Milestone')
  if (props.task.tags && props.task.tags.length > 0) fields.push('Tags')
  // Note: assignee might also be cleared, but we don't know for sure until the move happens
  return fields
})

const hasWarnings = computed(() => fieldsToBeCleared.value.length > 0)

async function fetchProjects() {
  if (!orgStore.currentOrganization) return

  loading.value = true
  try {
    const response = await fetchApi<{
      success: boolean
      data: { projects: Project[] }
    }>(`/api/projects?organizationId=${orgStore.currentOrganization.id}&status=active`)

    if (response.success) {
      // Filter out current project
      projects.value = response.data.projects.filter(p => p.id !== props.currentProjectId)
    }
  } catch {
    // Handle error silently
  } finally {
    loading.value = false
  }
}

async function handleMove() {
  if (!selectedProjectId.value || !props.task) return

  moving.value = true
  emit('move', selectedProjectId.value)
}

function handleClose() {
  selectedProjectId.value = null
  moving.value = false
  emit('close')
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    selectedProjectId.value = null
    moving.value = false
    fetchProjects()
  }
})
</script>

<template>
  <UiModal :open="open" title="Move Task to Project" @close="handleClose">
    <div v-if="task" class="space-y-4">
      <!-- Task info -->
      <div class="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
          {{ task.title }}
        </p>
        <p v-if="task.subtaskCount > 0" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {{ task.subtaskCount }} subtask{{ task.subtaskCount !== 1 ? 's' : '' }} will also be moved
        </p>
      </div>

      <!-- Project selector -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Destination Project
        </label>
        <div v-if="loading" class="flex items-center justify-center py-4">
          <UiLoadingSpinner size="sm" />
        </div>
        <div v-else-if="projects.length === 0" class="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
          No other projects available
        </div>
        <div v-else class="space-y-2 max-h-60 overflow-y-auto">
          <button
            v-for="project in projects"
            :key="project.id"
            type="button"
            class="w-full p-3 text-left border transition-colors"
            :class="selectedProjectId === project.id
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
            @click="selectedProjectId = project.id"
          >
            <p class="font-medium text-gray-900 dark:text-gray-100">
              {{ project.name }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {{ project.code }}
            </p>
          </button>
        </div>
      </div>

      <!-- Warning about cleared fields -->
      <div v-if="hasWarnings && selectedProjectId" class="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <div class="flex items-start gap-2">
          <svg class="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p class="text-sm font-medium text-amber-800 dark:text-amber-200">
              The following fields will be cleared:
            </p>
            <ul class="text-sm text-amber-700 dark:text-amber-300 mt-1 list-disc list-inside">
              <li v-for="field in fieldsToBeCleared" :key="field">{{ field }}</li>
              <li class="text-amber-600 dark:text-amber-400">Assignee (if not in destination organization)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          @click="handleClose"
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!selectedProjectId || moving"
          @click="handleMove"
        >
          {{ moving ? 'Moving...' : 'Move Task' }}
        </button>
      </div>
    </template>
  </UiModal>
</template>
