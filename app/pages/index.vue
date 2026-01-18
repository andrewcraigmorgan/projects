<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

// Redirect authenticated users to dashboard
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
  <div class="min-h-screen bg-gradient-to-br from-primary-600 to-primary-900">
    <div class="container mx-auto px-4 py-16">
      <div class="max-w-4xl mx-auto text-center">
        <h1 class="text-5xl font-bold text-white mb-6">
          Projects
        </h1>
        <p class="text-xl text-primary-100 mb-8">
          A powerful project management tool for teams. Organize tasks, track progress, and collaborate effectively.
        </p>

        <div class="flex justify-center gap-4">
          <NuxtLink
            to="/login"
            class="px-6 py-3 bg-white text-primary-600 font-medium rounded-lg hover:bg-primary-50 transition-colors"
          >
            Sign In
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="px-6 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-400 transition-colors"
          >
            Get Started
          </NuxtLink>
        </div>

        <!-- Features -->
        <div class="mt-20 grid md:grid-cols-3 gap-8">
          <div class="bg-white/10 backdrop-blur rounded-xl p-6 text-left">
            <div class="h-12 w-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">Task Management</h3>
            <p class="text-primary-200">Create tasks with unlimited subtasks. Organize work with Kanban boards.</p>
          </div>

          <div class="bg-white/10 backdrop-blur rounded-xl p-6 text-left">
            <div class="h-12 w-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">Team Collaboration</h3>
            <p class="text-primary-200">Work together with your team. Assign tasks and track progress.</p>
          </div>

          <div class="bg-white/10 backdrop-blur rounded-xl p-6 text-left">
            <div class="h-12 w-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">API Access</h3>
            <p class="text-primary-200">Full REST API with documentation. Integrate with your tools.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
