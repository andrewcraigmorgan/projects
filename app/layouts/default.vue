<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useOrganizationStore } from '~/stores/organization'

const authStore = useAuthStore()
const orgStore = useOrganizationStore()
const { isOpen, isMobile, close } = useSidebar()

// Redirect to login if not authenticated (only after auth is initialized)
watch(
  () => ({ isAuth: authStore.isAuthenticated, isInit: authStore.isInitialized }),
  ({ isAuth, isInit }) => {
    if (isInit && !isAuth && import.meta.client) {
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

// Close sidebar when clicking overlay
function handleOverlayClick() {
  close()
}
</script>

<template>
  <div class="flex h-screen bg-gradient-to-br from-gray-50 via-gray-100/50 to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
    <!-- Mobile overlay backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isMobile && isOpen"
        class="fixed inset-0 z-40 bg-black/50 lg:hidden"
        @click="handleOverlayClick"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      class="fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0"
      :class="isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'"
    >
      <LayoutSidebar @close="close" />
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-auto w-full">
      <slot />
    </main>
  </div>
</template>
