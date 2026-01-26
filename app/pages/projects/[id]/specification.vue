<script setup lang="ts">
import { useApi } from '~/composables/useApi'
import { useSpecification, useSpecificationApprovers } from '~/composables/useSpecification'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const { fetchApi } = useApi()
const authStore = useAuthStore()

const projectId = computed(() => route.params.id as string)

// Project data
const project = ref<{
  id: string
  name: string
  description: string
  status: string
  owner: { _id: string; name: string }
  members: Array<{ _id: string; name: string; email: string; role: string }>
} | null>(null)

const projectLoading = ref(true)
const projectError = ref(false)

// Specification
const {
  specification,
  loading: specLoading,
  error: specError,
  fetchSpecification,
  downloadPdf,
} = useSpecification(projectId)

// Approvers
const {
  approvers,
  loading: approversLoading,
  fetchApprovers,
  addApprover,
  removeApprover,
} = useSpecificationApprovers(projectId)

// UI state
const downloadingPdf = ref(false)
const showApproverModal = ref(false)
const expandedMilestones = ref<Set<string>>(new Set())

// Computed
const isProjectOwner = computed(() => {
  return project.value?.owner?._id === authStore.user?.id
})

const clientMembers = computed(() => {
  if (!project.value) return []
  return project.value.members.filter(m => m.role === 'client')
})

const currentUserIsApprover = computed(() => {
  return approvers.value.some(a => a.user.id === authStore.user?.id)
})

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

// Handle PDF download
async function handleDownloadPdf() {
  downloadingPdf.value = true
  try {
    await downloadPdf()
  } catch (e) {
    console.error('Failed to download PDF:', e)
  } finally {
    downloadingPdf.value = false
  }
}

// Toggle milestone expansion
function toggleMilestone(milestoneId: string) {
  if (expandedMilestones.value.has(milestoneId)) {
    expandedMilestones.value.delete(milestoneId)
  } else {
    expandedMilestones.value.add(milestoneId)
  }
}

// Expand all milestones
function expandAll() {
  specification.value?.milestones.forEach(m => {
    expandedMilestones.value.add(m.id)
  })
}

// Collapse all milestones
function collapseAll() {
  expandedMilestones.value.clear()
}

// Add approver handler
async function handleAddApprover(userId: string) {
  try {
    await addApprover(userId)
    showApproverModal.value = false
  } catch (e) {
    console.error('Failed to add approver:', e)
  }
}

// Remove approver handler
async function handleRemoveApprover(userId: string) {
  if (confirm('Are you sure you want to remove this approver?')) {
    await removeApprover(userId)
  }
}

// Set page title
useHead({
  title: computed(() => project.value?.name ? `Specification - ${project.value.name}` : 'Specification'),
})

// Initial load
onMounted(async () => {
  await loadProject()
  await Promise.all([
    fetchSpecification(),
    fetchApprovers(),
  ])
  // Expand all milestones by default
  expandAll()
})
</script>

<template>
  <div>
    <LayoutHeader :back-link="`/projects/${projectId}`">
      <template #title>
        <div v-if="projectLoading" class="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div v-else>
          <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Project Specification
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ project?.name }}
          </p>
        </div>
      </template>
      <template #actions>
        <ProjectsProjectNav :project-id="projectId" />
        <div class="flex items-center gap-2">
          <UiButton
            variant="secondary"
            :loading="downloadingPdf"
            @click="handleDownloadPdf"
          >
            <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
          </UiButton>
          <UiButton
            v-if="isProjectOwner"
            @click="showApproverModal = true"
          >
            Manage Approvers
          </UiButton>
        </div>
      </template>
    </LayoutHeader>

    <div class="p-6">
      <!-- Error state -->
      <div v-if="projectError || specError" class="text-center py-12">
        <p class="text-gray-500 dark:text-gray-400 mb-4">{{ specError || 'Project not found' }}</p>
        <NuxtLink to="/projects" class="text-primary-600 dark:text-primary-400 hover:underline">
          Back to Projects
        </NuxtLink>
      </div>

      <!-- Loading state -->
      <UiLoadingSpinner v-else-if="specLoading" />

      <!-- Specification content -->
      <div v-else-if="specification" class="space-y-6">
        <!-- Header info -->
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {{ specification.project.name }}
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Code: {{ specification.project.code }} | Owner: {{ specification.project.owner.name }}
              </p>
              <p v-if="specification.project.description" class="text-gray-600 dark:text-gray-300 mt-2">
                {{ specification.project.description }}
              </p>
            </div>
            <div class="text-right text-sm text-gray-500 dark:text-gray-400">
              <p>Generated: {{ new Date(specification.generatedAt).toLocaleString() }}</p>
              <p class="mt-1">{{ specification.milestones.length }} milestones</p>
            </div>
          </div>

          <!-- Approvers summary -->
          <div v-if="approvers.length > 0" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Designated Approvers ({{ approvers.length }})
            </h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="approver in approvers"
                :key="approver.id"
                class="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {{ approver.user.name }}
              </span>
            </div>
          </div>
          <div v-else class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p class="text-sm text-amber-600 dark:text-amber-400">
              No approvers designated. Add client members as approvers to enable milestone sign-off.
            </p>
          </div>
        </div>

        <!-- Controls -->
        <div class="flex justify-between items-center">
          <div class="flex gap-2">
            <button
              class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              @click="expandAll"
            >
              Expand All
            </button>
            <span class="text-gray-300 dark:text-gray-600">|</span>
            <button
              class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              @click="collapseAll"
            >
              Collapse All
            </button>
          </div>
        </div>

        <!-- Milestones -->
        <div class="space-y-4">
          <SpecificationMilestoneSection
            v-for="milestone in specification.milestones"
            :key="milestone.id"
            :milestone="milestone"
            :expanded="expandedMilestones.has(milestone.id)"
            :is-approver="currentUserIsApprover"
            :is-project-owner="isProjectOwner"
            @toggle="toggleMilestone(milestone.id)"
            @refresh="fetchSpecification"
          />
        </div>

        <!-- Unassigned tasks -->
        <div
          v-if="specification.unassignedTasks"
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 class="font-medium text-gray-900 dark:text-gray-100">
              Unassigned Tasks
              <span class="ml-2 text-sm text-gray-500 dark:text-gray-400">
                ({{ specification.unassignedTasks.taskStats.completed }}/{{ specification.unassignedTasks.taskStats.total }} completed)
              </span>
            </h3>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-gray-700">
            <SpecificationTaskRow
              v-for="task in specification.unassignedTasks.tasks"
              :key="task.id"
              :task="task"
              :depth="0"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Manage Approvers Modal -->
    <UiModal
      :open="showApproverModal"
      title="Manage Specification Approvers"
      @close="showApproverModal = false"
    >
      <div class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Designated approvers can sign off on milestones. Only client members can be approvers.
          All approvers must sign off before a milestone is locked.
        </p>

        <!-- Current approvers -->
        <div v-if="approvers.length > 0">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Current Approvers
          </h4>
          <div class="space-y-2">
            <div
              v-for="approver in approvers"
              :key="approver.id"
              class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50"
            >
              <div>
                <p class="font-medium text-gray-900 dark:text-gray-100">{{ approver.user.name }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ approver.user.email }}</p>
              </div>
              <button
                class="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                @click="handleRemoveApprover(approver.user.id)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>

        <!-- Add new approver -->
        <div v-if="clientMembers.length > 0">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Add Approver
          </h4>
          <div class="space-y-2">
            <div
              v-for="member in clientMembers.filter(m => !approvers.some(a => a.user.id === m._id))"
              :key="member._id"
              class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50"
            >
              <div>
                <p class="font-medium text-gray-900 dark:text-gray-100">{{ member.name }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ member.email }}</p>
              </div>
              <UiButton
                size="sm"
                @click="handleAddApprover(member._id)"
              >
                Add
              </UiButton>
            </div>
          </div>
          <p
            v-if="clientMembers.filter(m => !approvers.some(a => a.user.id === m._id)).length === 0"
            class="text-sm text-gray-500 dark:text-gray-400"
          >
            All client members are already approvers.
          </p>
        </div>
        <p v-else class="text-sm text-gray-500 dark:text-gray-400">
          No client members in this project. Invite clients to the project first.
        </p>

        <div class="flex justify-end pt-4">
          <UiButton
            variant="secondary"
            @click="showApproverModal = false"
          >
            Close
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>
