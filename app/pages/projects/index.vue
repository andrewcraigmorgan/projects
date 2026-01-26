<script setup lang="ts">
import { useOrganizationStore } from '~/stores/organization'
import { useProjects } from '~/composables/useProjects'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const orgStore = useOrganizationStore()
const {
  projects,
  loading,
  fetchProjects,
  createProject,
  // Pagination
  page: projectsPage,
  totalPages: projectsTotalPages,
  total: projectsTotal,
  limit: projectsLimit,
  setPage: setProjectsPage,
} = useProjects()

const showCreateModal = ref(false)
const newProjectName = ref('')
const newProjectDescription = ref('')
const creating = ref(false)

// Initialize page from URL
onMounted(() => {
  const urlPage = route.query.page as string
  if (urlPage) {
    const pageNum = parseInt(urlPage, 10)
    if (!isNaN(pageNum) && pageNum >= 1) {
      projectsPage.value = pageNum
    }
  }
})

// Update URL when page changes
function updateUrlParams() {
  const query: Record<string, string> = {}
  if (projectsPage.value > 1) query.page = String(projectsPage.value)
  router.replace({ query })
}

// Handle page change
async function handlePageChange(newPage: number) {
  await setProjectsPage(newPage)
  updateUrlParams()
}

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
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/settings/import"
            class="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
          >
            Import
          </NuxtLink>
          <UiButton @click="showCreateModal = true">
            New Project
          </UiButton>
        </div>
      </template>
    </LayoutHeader>

    <div class="p-6">
      <!-- Loading -->
      <UiLoadingSpinner v-if="loading" />

      <!-- Empty state -->
      <UiEmptyState
        v-else-if="projects.length === 0"
        title="No projects yet"
        description="Create your first project or import from another tool."
      >
        <template #icon>
          <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </template>
        <template #actions>
          <UiButton @click="showCreateModal = true">
            Create Project
          </UiButton>
          <NuxtLink
            to="/settings/import"
            class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-medium"
          >
            Import from Zoho
          </NuxtLink>
        </template>
      </UiEmptyState>

      <!-- Projects grid -->
      <div v-else>
        <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            v-for="project in projects"
            :key="project.id"
            :to="`/projects/${project.id}`"
            class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 p-5 shadow-soft hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 group"
          >
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{{ project.name }}</h3>
                <p v-if="project.description" class="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  {{ project.description }}
                </p>
              </div>
              <span
                class="px-2.5 py-1 text-xs font-medium rounded-full"
                :class="{
                  'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300': project.status === 'active',
                  'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300': project.status === 'archived',
                  'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300': project.status === 'completed',
                }"
              >
                {{ project.status }}
              </span>
            </div>

            <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>{{ project.memberCount }} member{{ project.memberCount !== 1 ? 's' : '' }}</span>
              <span>Updated {{ new Date(project.updatedAt).toLocaleDateString() }}</span>
            </div>
          </NuxtLink>
        </div>

        <!-- Pagination -->
        <UiPagination
          :current-page="projectsPage"
          :total-pages="projectsTotalPages"
          :total="projectsTotal"
          :limit="projectsLimit"
          @update:page="handlePageChange"
        />
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
              class="block w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3.5 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-500/20 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200"
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
