import { defineStore } from 'pinia'

interface User {
  id: string
  email: string
  name: string
  avatar?: string
  organizations: string[]
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isInitialized: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isInitialized: false,
  }),

  actions: {
    setAuth(user: User, token: string) {
      this.user = user
      this.token = token
      this.isAuthenticated = true

      // Persist token
      if (import.meta.client) {
        localStorage.setItem('auth_token', token)
      }
    },

    clearAuth() {
      this.user = null
      this.token = null
      this.isAuthenticated = false

      if (import.meta.client) {
        localStorage.removeItem('auth_token')
      }
    },

    async initAuth() {
      if (!import.meta.client) {
        this.isInitialized = true
        return
      }

      const token = localStorage.getItem('auth_token')
      if (!token) {
        this.isInitialized = true
        return
      }

      this.token = token

      try {
        const response = await $fetch<{ success: boolean; data: { user: User } }>(
          '/api/auth/me',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (response.success) {
          this.user = response.data.user
          this.isAuthenticated = true
        } else {
          this.clearAuth()
        }
      } catch {
        this.clearAuth()
      } finally {
        this.isInitialized = true
      }
    },

    async login(email: string, password: string, rememberMe?: boolean) {
      const response = await $fetch<{
        success: boolean
        data: { user: User; token: string }
        message?: string
      }>('/api/auth/login', {
        method: 'POST',
        body: { email, password, rememberMe },
      })

      if (response.success) {
        this.setAuth(response.data.user, response.data.token)
      }

      return response
    },

    async register(email: string, password: string, name: string) {
      const response = await $fetch<{
        success: boolean
        data: { user: User; token: string }
        message?: string
      }>('/api/auth/register', {
        method: 'POST',
        body: { email, password, name },
      })

      if (response.success) {
        this.setAuth(response.data.user, response.data.token)
      }

      return response
    },

    logout() {
      this.clearAuth()
      navigateTo('/login')
    },
  },
})
