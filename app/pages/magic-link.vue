<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: false,
})

const authStore = useAuthStore()

const email = ref('')
const loading = ref(false)
const sent = ref(false)
const error = ref('')

async function handleSubmit() {
  error.value = ''
  loading.value = true

  try {
    await $fetch('/api/auth/magic-link', {
      method: 'POST',
      body: { email: email.value },
    })
    sent.value = true
  } catch (e: any) {
    error.value = e.data?.message || 'Failed to send magic link'
  } finally {
    loading.value = false
  }
}

// Redirect if already authenticated
watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      navigateTo('/dashboard')
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
        <h2 class="mt-6 text-xl font-semibold text-gray-900 dark:text-gray-100">
          Sign in with email link
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          We'll send you a link to sign in - no password needed.
        </p>
      </div>

      <!-- Success message -->
      <div v-if="sent" class="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-6 text-center">
        <svg class="h-12 w-12 mx-auto text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
        </svg>
        <p class="text-green-700 dark:text-green-300 font-medium">Check your email</p>
        <p class="mt-2 text-sm text-green-600 dark:text-green-400">
          If an account exists for <strong>{{ email }}</strong>, we've sent a sign-in link.
        </p>
        <p class="mt-4 text-xs text-gray-500 dark:text-gray-400">
          The link will expire in 15 minutes.
        </p>
      </div>

      <!-- Form -->
      <form v-else class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <div
          v-if="error"
          class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 text-sm"
        >
          {{ error }}
        </div>

        <UiInput
          v-model="email"
          type="email"
          label="Email address"
          placeholder="you@example.com"
          required
        />

        <UiButton
          type="submit"
          :loading="loading"
          class="w-full"
        >
          Send sign-in link
        </UiButton>
      </form>

      <p class="text-center text-sm text-gray-600 dark:text-gray-400">
        <NuxtLink to="/login" class="text-primary-600 hover:text-primary-500 dark:text-primary-400">
          Sign in with password instead
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
