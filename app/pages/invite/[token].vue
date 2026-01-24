<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: false,
})

const route = useRoute()
const authStore = useAuthStore()

const token = computed(() => route.params.token as string)

// Invitation data
const invitation = ref<{
  email: string
  role: 'team' | 'client'
  project: { _id: string; name: string; description?: string }
  invitedBy: { name: string }
  expiresAt: string
} | null>(null)

const loading = ref(true)
const error = ref('')
const mode = ref<'login' | 'signup'>('signup')

// Form state
const form = reactive({
  password: '',
  name: '',
  rememberMe: false,
})

const submitting = ref(false)
const submitError = ref('')

// Fetch invitation details
async function loadInvitation() {
  loading.value = true
  error.value = ''

  try {
    const response = await $fetch<{
      success: boolean
      data: { invitation: typeof invitation.value }
    }>(`/api/invitations/${token.value}`)

    if (response.success) {
      invitation.value = response.data.invitation
      // Check if user already exists (to suggest login vs signup)
      // We can't check without exposing user existence, so default to signup
    }
  } catch (e: any) {
    error.value = e.data?.message || 'Invitation not found or expired'
  } finally {
    loading.value = false
  }
}

// Handle accept (existing user login)
async function handleLogin() {
  submitError.value = ''
  submitting.value = true

  try {
    const response = await $fetch<{
      success: boolean
      data: { user: any; token: string; projectId: string }
    }>('/api/invitations/accept', {
      method: 'POST',
      body: {
        token: token.value,
        email: invitation.value?.email,
        password: form.password,
        rememberMe: form.rememberMe,
      },
    })

    if (response.success) {
      authStore.setAuth(response.data.user, response.data.token)
      navigateTo(`/projects/${response.data.projectId}`)
    }
  } catch (e: any) {
    const message = e.data?.message || 'Failed to accept invitation'
    if (message.includes('User not found')) {
      mode.value = 'signup'
      submitError.value = 'No account found. Please create one below.'
    } else {
      submitError.value = message
    }
  } finally {
    submitting.value = false
  }
}

// Handle accept + signup (new user)
async function handleSignup() {
  submitError.value = ''

  if (form.password.length < 8) {
    submitError.value = 'Password must be at least 8 characters'
    return
  }

  submitting.value = true

  try {
    const response = await $fetch<{
      success: boolean
      data: { user: any; token: string; projectId: string }
    }>('/api/invitations/accept-signup', {
      method: 'POST',
      body: {
        token: token.value,
        password: form.password,
        name: form.name || undefined,
        rememberMe: form.rememberMe,
      },
    })

    if (response.success) {
      authStore.setAuth(response.data.user, response.data.token)
      navigateTo(`/projects/${response.data.projectId}`)
    }
  } catch (e: any) {
    const message = e.data?.message || 'Failed to create account'
    if (message.includes('already exists')) {
      mode.value = 'login'
      submitError.value = 'Account already exists. Please sign in.'
    } else {
      submitError.value = message
    }
  } finally {
    submitting.value = false
  }
}

function handleSubmit() {
  if (mode.value === 'login') {
    handleLogin()
  } else {
    handleSignup()
  }
}

onMounted(() => {
  loadInvitation()
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-8">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-r-transparent" />
        <p class="mt-4 text-gray-500 dark:text-gray-400">Loading invitation...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-8">
        <div class="mb-4 text-red-500">
          <svg class="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p class="text-gray-700 dark:text-gray-300 font-medium">{{ error }}</p>
        <NuxtLink to="/login" class="mt-4 inline-block text-primary-600 dark:text-primary-400 hover:underline">
          Go to login
        </NuxtLink>
      </div>

      <!-- Invitation details + form -->
      <template v-else-if="invitation">
        <!-- Project info card -->
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            <strong class="text-gray-900 dark:text-gray-100">{{ invitation.invitedBy.name }}</strong>
            invited you to join
          </p>
          <h2 class="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
            {{ invitation.project.name }}
          </h2>
          <p v-if="invitation.project.description" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {{ invitation.project.description }}
          </p>
          <div class="mt-3">
            <span
              class="inline-block text-xs font-medium px-2 py-1"
              :class="invitation.role === 'client'
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'"
            >
              {{ invitation.role === 'client' ? 'Client' : 'Team Member' }}
            </span>
          </div>
        </div>

        <!-- Accept form -->
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Accepting as <strong class="text-gray-900 dark:text-gray-100">{{ invitation.email }}</strong>
          </p>

          <!-- Mode toggle -->
          <div class="flex gap-4 mb-6 mt-4 border-b border-gray-200 dark:border-gray-700">
            <button
              class="pb-2 text-sm font-medium border-b-2 transition-colors"
              :class="mode === 'signup'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
              @click="mode = 'signup'; submitError = ''"
            >
              Create Account
            </button>
            <button
              class="pb-2 text-sm font-medium border-b-2 transition-colors"
              :class="mode === 'login'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
              @click="mode = 'login'; submitError = ''"
            >
              I Have an Account
            </button>
          </div>

          <form @submit.prevent="handleSubmit">
            <div
              v-if="submitError"
              class="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 text-sm"
            >
              {{ submitError }}
            </div>

            <div class="space-y-4">
              <!-- Name field (signup only) -->
              <UiInput
                v-if="mode === 'signup'"
                v-model="form.name"
                label="Name"
                placeholder="Your name (optional)"
              />

              <UiInput
                v-model="form.password"
                type="password"
                :label="mode === 'signup' ? 'Set a password' : 'Password'"
                :placeholder="mode === 'signup' ? 'At least 8 characters' : 'Enter your password'"
                required
              />

              <label class="flex items-center gap-2">
                <input
                  v-model="form.rememberMe"
                  type="checkbox"
                  class="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 dark:bg-gray-700"
                />
                <span class="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
              </label>
            </div>

            <UiButton
              type="submit"
              :loading="submitting"
              class="w-full mt-6"
            >
              {{ mode === 'signup' ? 'Create Account & Join' : 'Sign In & Join' }}
            </UiButton>
          </form>
        </div>
      </template>
    </div>
  </div>
</template>
