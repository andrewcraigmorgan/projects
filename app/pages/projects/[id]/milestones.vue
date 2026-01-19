<script setup lang="ts">
import { useApi } from '~/composables/useApi'
import { useMilestones, type Milestone } from '~/composables/useMilestones'

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

// Milestones
const {
  milestones,
  loading: milestonesLoading,
  fetchMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} = useMilestones(projectId)

// Create milestone modal
const showCreateModal = ref(false)
const newMilestone = ref({
  name: '',
  description: '',
  startDate: '',
  endDate: '',
})
const creating = ref(false)

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

// Handle milestone update
async function handleUpdate(milestoneId: string, data: Partial<Milestone>) {
  await updateMilestone(milestoneId, data)
}

// Handle milestone deletion
async function handleDelete(milestoneId: string) {
  if (confirm('Are you sure you want to delete this milestone?')) {
    await deleteMilestone(milestoneId)
  }
}

// Handle create milestone
async function handleCreate() {
  if (!newMilestone.value.name || !newMilestone.value.startDate || !newMilestone.value.endDate) {
    return
  }

  creating.value = true
  try {
    await createMilestone({
      name: newMilestone.value.name,
      description: newMilestone.value.description || undefined,
      startDate: newMilestone.value.startDate,
      endDate: newMilestone.value.endDate,
      status: 'pending',
    })
    showCreateModal.value = false
    newMilestone.value = { name: '', description: '', startDate: '', endDate: '' }
  } finally {
    creating.value = false
  }
}

// Set page title
useHead({
  title: computed(() => project.value?.name ? `Milestones - ${project.value.name}` : 'Milestones'),
})

// Initial load
onMounted(async () => {
  await loadProject()
  await fetchMilestones()
})
</script>

<template>
  <div>
    <LayoutHeader :back-link="`/projects/${projectId}`">
      <template #title>
        <div v-if="projectLoading" class="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div v-else>
          <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Milestones
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ project?.name }}
          </p>
        </div>
      </template>
      <template #actions>
        <UiButton @click="showCreateModal = true">
          New Milestone
        </UiButton>
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

      <!-- Loading state -->
      <div v-else-if="milestonesLoading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="h-40 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>

      <!-- Empty state -->
      <div v-else-if="milestones.length === 0" class="text-center py-12">
        <svg
          class="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No milestones</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get started by creating a new milestone.
        </p>
        <div class="mt-6">
          <UiButton @click="showCreateModal = true">
            New Milestone
          </UiButton>
        </div>
      </div>

      <!-- Milestones list -->
      <div v-else class="space-y-4">
        <MilestonesMilestoneCard
          v-for="milestone in milestones"
          :key="milestone.id"
          :milestone="milestone"
          @update="handleUpdate"
          @delete="handleDelete"
        />
      </div>
    </div>

    <!-- Create Milestone Modal -->
    <UiModal
      :open="showCreateModal"
      title="Create Milestone"
      @close="showCreateModal = false"
    >
      <form class="space-y-4" @submit.prevent="handleCreate">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name *
          </label>
          <input
            v-model="newMilestone.name"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Milestone name"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            v-model="newMilestone.description"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Optional description"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date *
            </label>
            <input
              v-model="newMilestone.startDate"
              type="date"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date *
            </label>
            <input
              v-model="newMilestone.endDate"
              type="date"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4">
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
          >
            Create Milestone
          </UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>
