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

const totalTasks = computed(() => {
  if (!specification.value) return 0
  let total = specification.value.milestones.reduce((sum, m) => sum + m.taskStats.total, 0)
  if (specification.value.unassignedTasks) {
    total += specification.value.unassignedTasks.taskStats.total
  }
  return total
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
    alert('Failed to download PDF. Please try again.')
  } finally {
    downloadingPdf.value = false
  }
}

// Add approver handler
async function handleAddApprover(userId: string) {
  try {
    await addApprover(userId)
    showApproverModal.value = false
    await fetchSpecification() // Refresh to get updated approver counts
  } catch (e) {
    console.error('Failed to add approver:', e)
  }
}

// Remove approver handler
async function handleRemoveApprover(userId: string) {
  if (confirm('Are you sure you want to remove this approver?')) {
    await removeApprover(userId)
    await fetchSpecification() // Refresh to get updated approver counts
  }
}

// Format date helper
function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Strip HTML helper
function stripHtml(html: string) {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
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
            variant="secondary"
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

      <!-- Document content -->
      <div v-else-if="specification" class="max-w-4xl mx-auto">
        <!-- Cover / Title Section -->
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 mb-8">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {{ specification.project.name }}
            </h1>
            <p class="text-lg text-gray-500 dark:text-gray-400">
              Project Specification Document
            </p>
            <p class="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Code: {{ specification.project.code }}
            </p>
          </div>

          <div v-if="specification.project.description" class="prose dark:prose-invert max-w-none mb-6">
            <p class="text-gray-600 dark:text-gray-300">{{ specification.project.description }}</p>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm border-t border-gray-200 dark:border-gray-700 pt-6">
            <div>
              <span class="text-gray-500 dark:text-gray-400">Project Owner:</span>
              <span class="ml-2 text-gray-900 dark:text-gray-100">{{ specification.project.owner.name }}</span>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Generated:</span>
              <span class="ml-2 text-gray-900 dark:text-gray-100">{{ formatDate(specification.generatedAt) }}</span>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Milestones:</span>
              <span class="ml-2 text-gray-900 dark:text-gray-100">{{ specification.milestones.length }}</span>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Total Items:</span>
              <span class="ml-2 text-gray-900 dark:text-gray-100">{{ totalTasks }}</span>
            </div>
          </div>

          <!-- Approvers -->
          <div v-if="approvers.length > 0" class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Designated Approvers</h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="approver in approvers"
                :key="approver.id"
                class="inline-flex items-center px-3 py-1 text-sm bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {{ approver.user.name }}
              </span>
            </div>
          </div>
        </div>

        <!-- Table of Contents -->
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Table of Contents</h2>
          <nav class="space-y-2">
            <a
              v-for="(milestone, index) in specification.milestones"
              :key="milestone.id"
              :href="`#milestone-${milestone.id}`"
              class="flex items-center text-primary-600 dark:text-primary-400 hover:underline"
            >
              <span>{{ index + 1 }}. {{ milestone.name }}</span>
              <span
                v-if="milestone.isLocked"
                class="ml-2 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5"
              >
                Approved
              </span>
              <span
                v-else-if="milestone.signoffStatus.signedCount > 0"
                class="ml-2 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5"
              >
                {{ milestone.signoffStatus.signedCount }}/{{ milestone.signoffStatus.totalApprovers }} Signed
              </span>
            </a>
            <a
              v-if="specification.unassignedTasks"
              href="#unassigned-tasks"
              class="block text-primary-600 dark:text-primary-400 hover:underline"
            >
              {{ specification.milestones.length + 1 }}. Additional Items
            </a>
          </nav>
        </div>

        <!-- Milestone Sections -->
        <div
          v-for="(milestone, index) in specification.milestones"
          :id="`milestone-${milestone.id}`"
          :key="milestone.id"
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 mb-6"
        >
          <!-- Milestone Header -->
          <div class="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span class="text-primary-600 dark:text-primary-400">{{ index + 1 }}.</span>
                  {{ milestone.name }}
                  <span
                    v-if="milestone.isLocked"
                    class="ml-2 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-1 font-medium"
                  >
                    ✓ Approved
                  </span>
                </h2>
                <div
                  v-if="milestone.description"
                  class="milestone-description prose prose-sm prose-gray dark:prose-invert max-w-none mt-3"
                  v-html="milestone.description"
                />
              </div>
              <div v-if="milestone.startDate || milestone.endDate" class="text-right text-sm text-gray-500 dark:text-gray-400 flex-shrink-0 ml-4">
                <div v-if="milestone.startDate">Start: {{ formatDate(milestone.startDate) }}</div>
                <div v-if="milestone.endDate">End: {{ formatDate(milestone.endDate) }}</div>
              </div>
            </div>

            <!-- Approval Status -->
            <div v-if="approvers.length > 0" class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
              <div class="flex items-center gap-3 flex-wrap">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Approval Status:</span>
                <span
                  class="px-3 py-1 text-sm font-medium"
                  :class="{
                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300': milestone.signoffStatus.status === 'complete',
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300': milestone.signoffStatus.status === 'partial',
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300': milestone.signoffStatus.status === 'pending',
                  }"
                >
                  {{ milestone.signoffStatus.status === 'complete' ? 'Fully Approved' : milestone.signoffStatus.status === 'partial' ? `${milestone.signoffStatus.signedCount}/${milestone.signoffStatus.totalApprovers} Signed` : 'Pending Approval' }}
                </span>
                <div v-if="milestone.signoffStatus.signoffs.length > 0" class="text-sm text-gray-500 dark:text-gray-400">
                  Signed by:
                  <span v-for="(signoff, i) in milestone.signoffStatus.signoffs" :key="signoff.id">
                    {{ signoff.signedBy.name }}{{ i < milestone.signoffStatus.signoffs.length - 1 ? ', ' : '' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Tasks List -->
          <div v-if="milestone.tasks.length > 0" class="space-y-4">
            <template v-for="task in milestone.tasks" :key="task.id">
              <SpecificationDocumentTask :task="task" :depth="0" />
            </template>
          </div>
          <p v-else class="text-gray-500 dark:text-gray-400 italic">
            No tasks in this milestone.
          </p>
        </div>

        <!-- Unassigned Tasks / Additional Items -->
        <div
          v-if="specification.unassignedTasks"
          id="unassigned-tasks"
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 mb-6"
        >
          <div class="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
              <span class="text-primary-600 dark:text-primary-400">{{ specification.milestones.length + 1 }}.</span>
              Additional Items
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Items not yet assigned to a milestone phase
            </p>
          </div>

          <div class="space-y-4">
            <template v-for="task in specification.unassignedTasks.tasks" :key="task.id">
              <SpecificationDocumentTask :task="task" :depth="0" />
            </template>
          </div>
        </div>

        <!-- Footer -->
        <div class="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
          <p>End of Specification Document</p>
          <p class="mt-1">Generated on {{ formatDate(specification.generatedAt) }}</p>
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

<style scoped>
.milestone-description :deep(p) {
  margin-bottom: 0.75em;
  color: rgb(75 85 99);
}

.milestone-description :deep(p:last-child) {
  margin-bottom: 0;
}

.milestone-description :deep(ul) {
  list-style-type: disc;
  padding-left: 1.5em;
  margin-bottom: 0.75em;
}

.milestone-description :deep(ol) {
  list-style-type: decimal;
  padding-left: 1.5em;
  margin-bottom: 0.75em;
}

.milestone-description :deep(li) {
  margin-bottom: 0.25em;
  color: rgb(75 85 99);
}

.milestone-description :deep(strong) {
  font-weight: 600;
}

:global(.dark) .milestone-description :deep(p),
:global(.dark) .milestone-description :deep(li) {
  color: rgb(156 163 175);
}
</style>
