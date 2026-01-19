<script setup lang="ts">
import { useOrganizationStore } from '~/stores/organization'
import { useProjects } from '~/composables/useProjects'

definePageMeta({
  layout: 'default',
})

const orgStore = useOrganizationStore()
const { projects, loading, fetchProjects, createProject } = useProjects()

const showCreateModal = ref(false)
const newProjectName = ref('')
const newProjectDescription = ref('')
const creating = ref(false)

// Redirect to last project if available
onMounted(() => {
  const lastProjectId = localStorage.getItem('lastProjectId')
  if (lastProjectId) {
    navigateTo(`/projects/${lastProjectId}`)
  }
})

// Fetch projects when org changes
watch(
  () => orgStore.currentOrganization,
  () => {
    if (orgStore.currentOrganization) {
      fetchProjects()
    }
  },
  { immediate: true }
)

async function handleCreate() {
  if (!newProjectName.value.trim()) return

  creating.value = true
  try {
    await createProject(newProjectName.value.trim(), newProjectDescription.value.trim())
    showCreateModal.value = false
    newProjectName.value = ''
    newProjectDescription.value = ''
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div>
    <LayoutHeader title="Projects">
      <template #actions>
        <UiButton @click="showCreateModal = true">
          New Project
        </UiButton>
      </template>
    </LayoutHeader>

    <div class="p-6">
      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
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

      <!-- Empty state -->
      <div
        v-else-if="projects.length === 0"
        class="text-center py-12"
      >
        <div class="h-16 w-16 bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
          <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No projects yet</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">Create your first project to get started.</p>
        <UiButton @click="showCreateModal = true">
          Create Project
        </UiButton>
      </div>

      <!-- Projects grid -->
      <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="project in projects"
          :key="project.id"
          :to="`/projects/${project.id}`"
          class="border border-gray-200 dark:border-gray-700 p-5 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
        >
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-medium text-gray-900 dark:text-gray-100">{{ project.name }}</h3>
              <p v-if="project.description" class="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                {{ project.description }}
              </p>
            </div>
            <span
              class="px-2 py-1 text-xs font-medium"
              :class="{
                'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300': project.status === 'active',
                'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300': project.status === 'archived',
                'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300': project.status === 'completed',
              }"
            >
              {{ project.status }}
            </span>
          </div>

          <div class="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>{{ project.memberCount }} member{{ project.memberCount !== 1 ? 's' : '' }}</span>
            <span>Updated {{ new Date(project.updatedAt).toLocaleDateString() }}</span>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- Create Project Modal -->
    <UiModal
      :open="showCreateModal"
      title="Create Project"
      @close="showCreateModal = false"
    >
      <form @submit.prevent="handleCreate">
        <div class="space-y-4">
          <UiInput
            v-model="newProjectName"
            label="Project Name"
            placeholder="My Project"
            required
          />

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              v-model="newProjectDescription"
              rows="3"
              class="block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-500"
              placeholder="Project description (optional)"
            />
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <UiButton
            type="button"
            variant="secondary"
            @click="showCreateModal = false"
          >
            Cancel
          </UiButton>
          <UiButton
            type="submit"
            :loading="creating"
            :disabled="!newProjectName.trim()"
          >
            Create Project
          </UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>
