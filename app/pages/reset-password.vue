<script setup lang="ts">
definePageMeta({
  layout: false,
})

const route = useRoute()

const form = reactive({
  password: '',
  confirmPassword: '',
})

const error = ref('')
const success = ref(false)
const loading = ref(false)

const token = computed(() => route.query.token as string)

async function handleSubmit() {
  error.value = ''

  if (!token.value) {
    error.value = 'Invalid reset link'
    return
  }

  if (form.password !== form.confirmPassword) {
    error.value = 'Passwords do not match'
    return
  }

  if (form.password.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }

  loading.value = true

  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: {
        token: token.value,
        password: form.password,
      },
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
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
        <h2 class="mt-6 text-xl font-semibold text-gray-900 dark:text-gray-100">
          Set new password
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Enter your new password below
        </p>
      </div>

      <div v-if="success" class="mt-8 space-y-6">
        <div class="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 text-sm">
          Your password has been reset successfully.
        </div>
        <NuxtLink to="/login">
          <UiButton class="w-full">
            Go to login
          </UiButton>
        </NuxtLink>
      </div>

      <div v-else-if="!token" class="mt-8 space-y-6">
        <div class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 text-sm">
          Invalid reset link. Please request a new password reset.
        </div>
        <NuxtLink to="/forgot-password">
          <UiButton class="w-full">
            Request new reset link
          </UiButton>
        </NuxtLink>
      </div>

      <form v-else class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <div
          v-if="error"
          class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 text-sm"
        >
          {{ error }}
        </div>

        <div class="space-y-4">
          <UiInput
            v-model="form.password"
            type="password"
            label="New password"
            placeholder="At least 8 characters"
            required
          />

          <UiInput
            v-model="form.confirmPassword"
            type="password"
            label="Confirm password"
            placeholder="Confirm your new password"
            required
          />
        </div>

        <UiButton
          type="submit"
          :loading="loading"
          class="w-full"
        >
          Reset password
        </UiButton>

        <p class="text-center text-sm text-gray-600 dark:text-gray-400">
          <NuxtLink to="/login" class="text-primary-600 hover:text-primary-500 dark:text-primary-400">
            Back to login
          </NuxtLink>
        </p>
      </form>
    </div>
  </div>
</template>
