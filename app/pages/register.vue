<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: false,
})

const authStore = useAuthStore()

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''

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
    await authStore.register(form.email, form.password, form.name)
    navigateTo('/dashboard')
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'data' in e) {
      const err = e as { data?: { message?: string } }
      error.value = err.data?.message || 'Registration failed'
    } else {
      error.value = 'Registration failed'
    }
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
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900">Projects</h1>
        <h2 class="mt-6 text-xl font-semibold text-gray-900">
          Create your account
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          Already have an account?
          <NuxtLink to="/login" class="text-primary-600 hover:text-primary-500">
            Sign in
          </NuxtLink>
        </p>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <div
          v-if="error"
          class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm"
        >
          {{ error }}
        </div>

        <div class="space-y-4">
          <UiInput
            v-model="form.name"
            label="Name"
            placeholder="Your name"
            required
          />

          <UiInput
            v-model="form.email"
            type="email"
            label="Email address"
            placeholder="you@example.com"
            required
          />

          <UiInput
            v-model="form.password"
            type="password"
            label="Password"
            placeholder="At least 8 characters"
            required
          />

          <UiInput
            v-model="form.confirmPassword"
            type="password"
            label="Confirm Password"
            placeholder="Confirm your password"
            required
          />
        </div>

        <UiButton
          type="submit"
          :loading="loading"
          class="w-full"
        >
          Create account
        </UiButton>
      </form>
    </div>
  </div>
</template>
