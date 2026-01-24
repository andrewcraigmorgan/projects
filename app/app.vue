<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useDarkMode } from '~/composables/useDarkMode'

const authStore = useAuthStore()
const { init: initDarkMode } = useDarkMode()

onMounted(() => {
  authStore.initAuth()
  initDarkMode()
  // Mark as ready to show content (prevents FOUC)
  document.documentElement.classList.add('ready')
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
