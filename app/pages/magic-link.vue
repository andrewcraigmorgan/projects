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
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 py-12 px-4">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <div class="flex justify-center mb-4">
          <div class="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-xl shadow-primary-500/25">
            <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
        <h2 class="mt-4 text-lg font-medium text-gray-600 dark:text-gray-400">
          Sign in with email link
        </h2>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-500">
          We'll send you a link to sign in - no password needed
        </p>
      </div>

      <!-- Success message -->
      <div v-if="sent" class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-soft-lg border border-gray-200/60 dark:border-gray-700/60 text-center">
        <div class="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 flex items-center justify-center mx-auto mb-4">
          <svg class="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
          </svg>
        </div>
        <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">Check your email</p>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          If an account exists for <strong class="text-gray-900 dark:text-gray-100">{{ email }}</strong>, we've sent a sign-in link.
        </p>
        <p class="mt-4 text-xs text-gray-500 dark:text-gray-500">
          The link will expire in 15 minutes.
        </p>
      </div>

      <!-- Form -->
      <form v-else class="mt-8 space-y-6 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-soft-lg border border-gray-200/60 dark:border-gray-700/60" @submit.prevent="handleSubmit">
        <div
          v-if="error"
          class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 text-sm rounded-lg"
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
        <NuxtLink to="/login" class="text-primary-600 hover:text-primary-500 dark:text-primary-400 font-medium">
          Sign in with password instead
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
