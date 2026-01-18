<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

onMounted(() => {
  authStore.initAuth()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>
