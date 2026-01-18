<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useOrganizationStore } from '~/stores/organization'

definePageMeta({
  layout: 'default',
})

const authStore = useAuthStore()
const orgStore = useOrganizationStore()

const showCreateOrgModal = ref(false)
const newOrgName = ref('')
const creating = ref(false)

async function createOrganization() {
  if (!newOrgName.value.trim()) return

  creating.value = true
  try {
    await orgStore.createOrganization(newOrgName.value.trim())
    showCreateOrgModal.value = false
    newOrgName.value = ''
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div>
    <LayoutHeader title="Dashboard" />

    <div class="p-6">
      <!-- No organization -->
      <div
        v-if="orgStore.organizations.length === 0 && !orgStore.loading"
        class="max-w-lg mx-auto text-center py-12"
      >
        <div class="h-16 w-16 bg-primary-100 dark:bg-primary-900 flex items-center justify-center mx-auto mb-4">
          <svg class="h-8 w-8 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Welcome to Projects!
        </h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Create your first organization to get started with project management.
        </p>
        <UiButton @click="showCreateOrgModal = true">
          Create Organization
        </UiButton>
      </div>

      <!-- Dashboard content -->
      <div v-else-if="orgStore.currentOrganization" class="space-y-6">
        <div class="grid gap-6 md:grid-cols-3">
          <!-- Stats cards -->
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center">
              <div class="h-12 w-12 bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <svg class="h-6 w-6 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Organization</p>
                <p class="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {{ orgStore.currentOrganization.name }}
                </p>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center">
              <div class="h-12 w-12 bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <svg class="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Members</p>
                <p class="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {{ orgStore.currentOrganization.memberCount }}
                </p>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center">
              <div class="h-12 w-12 bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <svg class="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Your Role</p>
                <p class="text-xl font-semibold text-gray-900 dark:text-gray-100 capitalize">
                  {{ orgStore.currentOrganization.myRole }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick actions -->
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h3>
          <div class="flex flex-wrap gap-4">
            <NuxtLink
              to="/projects"
              class="inline-flex items-center px-4 py-2 bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors"
            >
              <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              View Projects
            </NuxtLink>
            <a
              href="/docs"
              target="_blank"
              class="inline-flex items-center px-4 py-2 bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              API Documentation
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Organization Modal -->
    <UiModal
      :open="showCreateOrgModal"
      title="Create Organization"
      @close="showCreateOrgModal = false"
    >
      <form @submit.prevent="createOrganization">
        <UiInput
          v-model="newOrgName"
          label="Organization Name"
          placeholder="My Organization"
          required
        />

        <div class="mt-6 flex justify-end gap-3">
          <UiButton
            type="button"
            variant="secondary"
            @click="showCreateOrgModal = false"
          >
            Cancel
          </UiButton>
          <UiButton
            type="submit"
            :loading="creating"
            :disabled="!newOrgName.trim()"
          >
            Create
          </UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>
