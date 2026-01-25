<script setup lang="ts">
definePageMeta({
  layout: false,
})

const form = reactive({
  email: '',
})

const error = ref('')
const success = ref(false)
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  loading.value = true

  try {
    await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: form.email },
    })
    success.value = true
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'data' in e) {
      const err = e as { data?: { message?: string } }
      error.value = err.data?.message || 'An error occurred'
    } else {
      error.value = 'An error occurred'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 py-12 px-4">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <div class="flex justify-center mb-4">
          <div class="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-xl shadow-primary-500/25">
            <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
        <h2 class="mt-4 text-lg font-medium text-gray-600 dark:text-gray-400">
          Reset your password
        </h2>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-500">
          Enter your email and we'll send you a reset link
        </p>
      </div>

      <div v-if="success" class="mt-8 space-y-6 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-soft-lg border border-gray-200/60 dark:border-gray-700/60">
        <div class="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 text-sm rounded-lg">
          If an account exists with that email, you will receive a password reset link.
        </div>
        <p class="text-center text-sm text-gray-600 dark:text-gray-400">
          <NuxtLink to="/login" class="text-primary-600 hover:text-primary-500 dark:text-primary-400 font-medium">
            Back to login
          </NuxtLink>
        </p>
      </div>

      <form v-else class="mt-8 space-y-6 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-soft-lg border border-gray-200/60 dark:border-gray-700/60" @submit.prevent="handleSubmit">
        <div
          v-if="error"
          class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 text-sm rounded-lg"
        >
          {{ error }}
        </div>

        <div class="space-y-4">
          <UiInput
            v-model="form.email"
            type="email"
            label="Email address"
            placeholder="you@example.com"
            required
          />
        </div>

        <UiButton
          type="submit"
          :loading="loading"
          class="w-full"
        >
          Send reset link
        </UiButton>

        <p class="text-center text-sm text-gray-600 dark:text-gray-400">
          <NuxtLink to="/login" class="text-primary-600 hover:text-primary-500 dark:text-primary-400 font-medium">
            Back to login
          </NuxtLink>
        </p>
      </form>
    </div>
  </div>
</template>
