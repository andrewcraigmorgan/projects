<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useOrganizationStore } from '~/stores/organization'

const authStore = useAuthStore()
const orgStore = useOrganizationStore()

// Redirect to login if not authenticated
watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (!isAuthenticated && import.meta.client) {
      navigateTo('/login')
    }
  },
  { immediate: true }
)

// Fetch organizations when authenticated
watch(
  () => authStore.isAuthenticated,
  async (isAuthenticated) => {
    if (isAuthenticated) {
      await orgStore.fetchOrganizations()
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="flex h-screen bg-gray-50">
    <LayoutSidebar />
    <main class="flex-1 overflow-auto">
      <slot />
    </main>
  </div>
</template>
