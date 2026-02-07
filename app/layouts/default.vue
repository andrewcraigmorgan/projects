<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useOrganizationStore } from '~/stores/organization'

const authStore = useAuthStore()
const orgStore = useOrganizationStore()
const { isOpen, isMobile, close } = useSidebar()

watch(
  () => ({ isAuth: authStore.isAuthenticated, isInit: authStore.isInitialized }),
  ({ isAuth, isInit }) => {
    if (isInit && !isAuth && import.meta.client) {
      navigateTo('/login')
    }
  },
  { immediate: true }
)

watch(
  () => authStore.isAuthenticated,
  async (isAuthenticated) => {
    if (isAuthenticated) {
      await orgStore.fetchOrganizations()
    }
  },
  { immediate: true }
)

function handleOverlayClick() {
  close()
}
</script>

<template>
  <div class="flex h-screen bg-gradient-to-br from-gray-50 via-gray-100/50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 bg-grid-pattern">
    <!-- Skip navigation link for keyboard users -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-gradient-to-r focus:from-primary-600 focus:to-primary-500 focus:text-white focus:rounded-xl focus:shadow-lg focus:shadow-primary-500/30 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
    >
      Skip to main content
    </a>

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
        class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        @click="handleOverlayClick"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      class="fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-out lg:translate-x-0"
      :class="isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'"
    >
      <LayoutSidebar @close="close" />
    </aside>

    <!-- Main content -->
    <main id="main-content" class="flex-1 overflow-auto w-full" tabindex="-1">
      <slot />
    </main>
  </div>
</template>
