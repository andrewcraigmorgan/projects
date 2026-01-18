import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

interface Organization {
  id: string
  name: string
  slug: string
  owner: { id: string; name: string; email: string }
  memberCount: number
  myRole: 'owner' | 'admin' | 'member'
  createdAt: string
}

interface OrganizationState {
  organizations: Organization[]
  currentOrganization: Organization | null
  loading: boolean
}

export const useOrganizationStore = defineStore('organization', {
  state: (): OrganizationState => ({
    organizations: [],
    currentOrganization: null,
    loading: false,
  }),

  actions: {
    async fetchOrganizations() {
      const authStore = useAuthStore()
      if (!authStore.token) return

      this.loading = true
      try {
        const response = await $fetch<{
          success: boolean
          data: { organizations: Organization[] }
        }>('/api/organizations', {
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        if (response.success) {
          this.organizations = response.data.organizations

          // Set current org if not set
          if (!this.currentOrganization && this.organizations.length > 0) {
            this.currentOrganization = this.organizations[0]
          }
        }
      } finally {
        this.loading = false
      }
    },

    async createOrganization(name: string) {
      const authStore = useAuthStore()
      if (!authStore.token) return

      const response = await $fetch<{
        success: boolean
        data: { organization: Organization }
      }>('/api/organizations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authStore.token}`,
        },
        body: { name },
      })

      if (response.success) {
        this.organizations.push(response.data.organization)
        this.currentOrganization = response.data.organization
      }

      return response
    },

    setCurrentOrganization(org: Organization) {
      this.currentOrganization = org
      if (import.meta.client) {
        localStorage.setItem('current_org_id', org.id)
      }
    },

    clearOrganizations() {
      this.organizations = []
      this.currentOrganization = null
    },
  },
})
