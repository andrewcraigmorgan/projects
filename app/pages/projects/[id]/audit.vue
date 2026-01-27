<script setup lang="ts">
import { useApi } from '~/composables/useApi'
import { useAudit, type AuditLog, type AuditFilters } from '~/composables/useAudit'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const { fetchApi } = useApi()

const projectId = computed(() => route.params.id as string)

// Project data (for header)
const project = ref<{ name: string; code: string } | null>(null)
const projectLoading = ref(true)

async function loadProject() {
  projectLoading.value = true
  try {
    const response = await fetchApi<{
      success: boolean
      data: { project: { name: string; code: string } }
    }>(`/api/projects/${projectId.value}`)

    if (response.success) {
      project.value = response.data.project
    }
  } catch {
    // Handle error
  } finally {
    projectLoading.value = false
  }
}

// Audit logs
const { logs, loading, error, total, page, totalPages, fetchAuditLogs, setPage } = useAudit(projectId)

// Filters
const filters = reactive<AuditFilters>({
  resourceType: undefined,
  action: undefined,
})

// Expanded rows
const expandedRows = ref<Set<string>>(new Set())

function toggleRow(id: string) {
  if (expandedRows.value.has(id)) {
    expandedRows.value.delete(id)
  } else {
    expandedRows.value.add(id)
  }
}

// Action labels
const actionLabels: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  status_change: 'Status Changed',
  move: 'Moved',
  lock: 'Locked',
  unlock: 'Unlocked',
  signoff: 'Signed Off',
  revoke_signoff: 'Revoked Sign-off',
  add_member: 'Added Member',
  remove_member: 'Removed Member',
  change_role: 'Changed Role',
  invite: 'Invited',
  accept_invite: 'Accepted Invite',
  add_approver: 'Added Approver',
  remove_approver: 'Removed Approver',
}

// Resource type labels
const resourceLabels: Record<string, string> = {
  task: 'Task',
  project: 'Project',
  milestone: 'Milestone',
  comment: 'Comment',
  tag: 'Tag',
  organization: 'Organization',
  invitation: 'Invitation',
  api_key: 'API Key',
  approver: 'Approver',
  member: 'Member',
  signoff: 'Sign-off',
}

// Action badge colors
function getActionColor(action: string): string {
  switch (action) {
    case 'create':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'delete':
    case 'remove_member':
    case 'remove_approver':
    case 'revoke_signoff':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'update':
    case 'status_change':
    case 'change_role':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'lock':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'unlock':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    case 'signoff':
    case 'accept_invite':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString()
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

async function applyFilters() {
  setPage(1)
  await fetchAuditLogs(filters)
}

async function clearFilters() {
  filters.resourceType = undefined
  filters.action = undefined
  setPage(1)
  await fetchAuditLogs()
}

async function goToPage(newPage: number) {
  setPage(newPage)
  await fetchAuditLogs(filters)
}

useHead({
  title: computed(() => project.value?.name ? `Audit Log - ${project.value.name}` : 'Audit Log'),
})

onMounted(async () => {
  await loadProject()
  await fetchAuditLogs()
})
</script>

<template>
  <div>
    <LayoutHeader :back-link="`/projects/${projectId}`">
      <template #title>
        <div v-if="projectLoading" class="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div v-else class="min-w-0">
          <h1 class="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 truncate">
            Audit Log
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ project?.name }}
          </p>
        </div>
      </template>
      <template #actions>
        <ProjectsProjectNav :project-id="projectId" />
      </template>
    </LayoutHeader>

    <div class="p-4 sm:p-6">
      <!-- Filters -->
      <div class="mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Resource Type
          </label>
          <select
            v-model="filters.resourceType"
            class="block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
          >
            <option :value="undefined">All</option>
            <option value="task">Task</option>
            <option value="milestone">Milestone</option>
            <option value="comment">Comment</option>
            <option value="tag">Tag</option>
            <option value="member">Member</option>
            <option value="invitation">Invitation</option>
            <option value="approver">Approver</option>
            <option value="signoff">Sign-off</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Action
          </label>
          <select
            v-model="filters.action"
            class="block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
          >
            <option :value="undefined">All</option>
            <option value="create">Created</option>
            <option value="update">Updated</option>
            <option value="delete">Deleted</option>
            <option value="status_change">Status Changed</option>
            <option value="move">Moved</option>
            <option value="lock">Locked</option>
            <option value="unlock">Unlocked</option>
            <option value="signoff">Sign-off</option>
          </select>
        </div>

        <div class="flex gap-2">
          <button
            type="button"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            @click="applyFilters"
          >
            Apply Filters
          </button>
          <button
            type="button"
            class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            @click="clearFilters"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- Error message -->
      <div
        v-if="error"
        class="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4"
      >
        <p class="text-sm text-red-700 dark:text-red-200">{{ error }}</p>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>

      <!-- Audit log table -->
      <div v-else-if="logs.length > 0" class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-6">
                Date
              </th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                User
              </th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                Action
              </th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                Resource
              </th>
              <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span class="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
            <template v-for="log in logs" :key="log.id">
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 dark:text-gray-400 sm:pl-6">
                  {{ formatDate(log.createdAt) }}
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-gray-100">
                  <div class="font-medium">{{ log.actor.name }}</div>
                  <div class="text-gray-500 dark:text-gray-400 text-xs">{{ log.actor.email }}</div>
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm">
                  <span :class="['inline-flex items-center rounded-md px-2 py-1 text-xs font-medium', getActionColor(log.action)]">
                    {{ actionLabels[log.action] || log.action }}
                  </span>
                </td>
                <td class="px-3 py-4 text-sm text-gray-900 dark:text-gray-100">
                  <div class="font-medium">{{ log.resource.name || log.resource.id }}</div>
                  <div class="text-gray-500 dark:text-gray-400 text-xs">
                    {{ resourceLabels[log.resource.type] || log.resource.type }}
                  </div>
                </td>
                <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                  <button
                    v-if="log.changes && log.changes.length > 0"
                    type="button"
                    class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    @click="toggleRow(log.id)"
                  >
                    {{ expandedRows.has(log.id) ? 'Hide' : 'Show' }} Details
                  </button>
                </td>
              </tr>
              <!-- Expanded row for changes -->
              <tr v-if="expandedRows.has(log.id) && log.changes && log.changes.length > 0">
                <td colspan="5" class="px-6 py-4 bg-gray-50 dark:bg-gray-800">
                  <div class="text-sm">
                    <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-2">Changes</h4>
                    <div class="space-y-2">
                      <div
                        v-for="(change, idx) in log.changes"
                        :key="idx"
                        class="flex items-center gap-4"
                      >
                        <span class="font-medium text-gray-700 dark:text-gray-300 min-w-24">
                          {{ change.field }}:
                        </span>
                        <span class="text-red-600 dark:text-red-400 line-through">
                          {{ formatValue(change.oldValue) }}
                        </span>
                        <span class="text-gray-400">→</span>
                        <span class="text-green-600 dark:text-green-400">
                          {{ formatValue(change.newValue) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Empty state -->
      <div
        v-else
        class="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <svg
          class="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No audit logs</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          No activities have been recorded yet.
        </p>
      </div>

      <!-- Pagination -->
      <div
        v-if="totalPages > 1"
        class="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 sm:px-6 rounded-lg"
      >
        <div class="flex flex-1 justify-between sm:hidden">
          <button
            :disabled="page === 1"
            class="relative inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            @click="goToPage(page - 1)"
          >
            Previous
          </button>
          <button
            :disabled="page === totalPages"
            class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            @click="goToPage(page + 1)"
          >
            Next
          </button>
        </div>
        <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700 dark:text-gray-300">
              Showing page <span class="font-medium">{{ page }}</span> of
              <span class="font-medium">{{ totalPages }}</span>
              (<span class="font-medium">{{ total }}</span> total entries)
            </p>
          </div>
          <div>
            <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                :disabled="page === 1"
                class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                @click="goToPage(page - 1)"
              >
                <span class="sr-only">Previous</span>
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fill-rule="evenodd"
                    d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <button
                :disabled="page === totalPages"
                class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                @click="goToPage(page + 1)"
              >
                <span class="sr-only">Next</span>
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fill-rule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
