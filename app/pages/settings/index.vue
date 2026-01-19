<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useOrganizationStore } from '~/stores/organization'
import { useApi } from '~/composables/useApi'

definePageMeta({
  layout: 'default',
})

const authStore = useAuthStore()
const orgStore = useOrganizationStore()
const { fetchApi } = useApi()

// API Keys
const apiKeys = ref<{ key: string; name: string; createdAt: string }[]>([])
const showCreateKeyModal = ref(false)
const newKeyName = ref('')
const creatingKey = ref(false)
const newlyCreatedKey = ref<string | null>(null)

async function createApiKey() {
  if (!newKeyName.value.trim()) return

  creatingKey.value = true
  try {
    const response = await fetchApi<{
      success: boolean
      data: { apiKey: { key: string; name: string; createdAt: string } }
    }>('/api/auth/api-keys', {
      method: 'POST',
      body: { name: newKeyName.value.trim() },
    })

    if (response.success) {
      newlyCreatedKey.value = response.data.apiKey.key
      apiKeys.value.push({
        key: response.data.apiKey.key.slice(0, 10) + '...',
        name: response.data.apiKey.name,
        createdAt: response.data.apiKey.createdAt,
      })
      newKeyName.value = ''
    }
  } finally {
    creatingKey.value = false
  }
}

function closeKeyModal() {
  showCreateKeyModal.value = false
  newlyCreatedKey.value = null
}
</script>

<template>
  <div>
    <LayoutHeader title="Settings" />

    <div class="p-6 max-w-3xl">
      <!-- Profile Section -->
      <div class="border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Profile</h3>

        <div class="flex items-center gap-4">
          <div
            class="h-16 w-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-xl font-medium"
          >
            {{ authStore.user?.name?.[0]?.toUpperCase() || '?' }}
          </div>
          <div>
            <p class="font-medium text-gray-900 dark:text-gray-100">{{ authStore.user?.name }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ authStore.user?.email }}</p>
          </div>
        </div>
      </div>

      <!-- Organization Section -->
      <div v-if="orgStore.currentOrganization" class="border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Organization</h3>

        <dl class="space-y-3">
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Name</dt>
            <dd class="text-gray-900 dark:text-gray-100">{{ orgStore.currentOrganization.name }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Slug</dt>
            <dd class="text-gray-900 dark:text-gray-100">{{ orgStore.currentOrganization.slug }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Your Role</dt>
            <dd class="text-gray-900 dark:text-gray-100 capitalize">{{ orgStore.currentOrganization.myRole }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Members</dt>
            <dd class="text-gray-900 dark:text-gray-100">{{ orgStore.currentOrganization.memberCount }}</dd>
          </div>
        </dl>
      </div>

      <!-- Import Data Section -->
      <div class="border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Import Data</h3>

        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Import tasks and projects from other tools like Zoho Projects via CSV export.
        </p>

        <NuxtLink
          to="/settings/import"
          class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import from CSV
        </NuxtLink>
      </div>

      <!-- API Keys Section -->
      <div class="border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">API Keys</h3>
          <UiButton size="sm" @click="showCreateKeyModal = true">
            Create Key
          </UiButton>
        </div>

        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Use API keys to authenticate with the Projects API. Keys have the same permissions as your account.
        </p>

        <div v-if="apiKeys.length > 0" class="space-y-2">
          <div
            v-for="key in apiKeys"
            :key="key.key"
            class="flex items-center justify-between py-2 px-3 bg-gray-100 dark:bg-gray-800"
          >
            <div>
              <p class="font-medium text-gray-900 dark:text-gray-100">{{ key.name }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 font-mono">{{ key.key }}</p>
            </div>
            <span class="text-xs text-gray-400">
              Created {{ new Date(key.createdAt).toLocaleDateString() }}
            </span>
          </div>
        </div>

        <p v-else class="text-sm text-gray-500 dark:text-gray-400 italic">
          No API keys created yet.
        </p>

        <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <a
            href="/docs"
            target="_blank"
            class="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-500"
          >
            View API Documentation
          </a>
        </div>
      </div>
    </div>

    <!-- Create API Key Modal -->
    <UiModal
      :open="showCreateKeyModal"
      title="Create API Key"
      @close="closeKeyModal"
    >
      <div v-if="newlyCreatedKey">
        <div class="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-4 mb-4">
          <p class="text-sm text-green-800 dark:text-green-300 mb-2">
            Your API key has been created. Copy it now - you won't be able to see it again!
          </p>
          <code class="block p-2 bg-white dark:bg-gray-900 border dark:border-gray-700 text-sm font-mono break-all text-gray-900 dark:text-gray-100">
            {{ newlyCreatedKey }}
          </code>
        </div>

        <UiButton class="w-full" @click="closeKeyModal">
          Done
        </UiButton>
      </div>

      <form v-else @submit.prevent="createApiKey">
        <UiInput
          v-model="newKeyName"
          label="Key Name"
          placeholder="e.g., CI/CD Pipeline"
          required
        />

        <div class="mt-6 flex justify-end gap-3">
          <UiButton
            type="button"
            variant="secondary"
            @click="closeKeyModal"
          >
            Cancel
          </UiButton>
          <UiButton
            type="submit"
            :loading="creatingKey"
            :disabled="!newKeyName.trim()"
          >
            Create Key
          </UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>
