<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: false,
})

const route = useRoute()
const authStore = useAuthStore()

const status = ref<'verifying' | 'success' | 'error'>('verifying')
const error = ref('')
const rememberMe = ref(false)

async function verifyToken() {
  const token = route.query.token as string

  if (!token) {
    status.value = 'error'
    error.value = 'No token provided'
    return
  }

  try {
    const response = await $fetch<{
      success: boolean
      data: { user: any; token: string }
    }>('/api/auth/magic-link-verify', {
      method: 'POST',
      body: { token, rememberMe: rememberMe.value },
    })

    if (response.success) {
      authStore.setAuth(response.data.user, response.data.token)
      status.value = 'success'
      // Auto-redirect after brief success display
      setTimeout(() => {
        navigateTo('/dashboard')
      }, 1000)
    }
  } catch (e: any) {
    status.value = 'error'
    error.value = e.data?.message || 'Invalid or expired link'
  }
}

onMounted(() => {
  verifyToken()
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
    <div class="max-w-md w-full space-y-8 text-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
      </div>

      <!-- Verifying -->
      <div v-if="status === 'verifying'" class="py-8">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-r-transparent" />
        <p class="mt-4 text-gray-600 dark:text-gray-400">Signing you in...</p>
      </div>

      <!-- Success -->
      <div v-else-if="status === 'success'" class="py-8">
        <svg class="h-12 w-12 mx-auto text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <p class="text-green-700 dark:text-green-300 font-medium">Signed in successfully</p>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Redirecting to dashboard...</p>
      </div>

      <!-- Error -->
      <div v-else class="py-8">
        <svg class="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p class="text-red-600 dark:text-red-400 font-medium">{{ error }}</p>
        <div class="mt-6 space-y-3">
          <NuxtLink to="/magic-link" class="block text-primary-600 dark:text-primary-400 hover:underline">
            Request a new link
          </NuxtLink>
          <NuxtLink to="/login" class="block text-gray-500 dark:text-gray-400 hover:underline">
            Sign in with password
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
