import { useApi } from './useApi'
import { useOrganizationStore } from '~/stores/organization'

export interface Project {
  id: string
  code: string
  name: string
  description: string
  status: 'active' | 'archived' | 'completed'
  owner: { id: string; name: string; email: string; avatar?: string }
  memberCount: number
  taskCount: number
  createdAt: string
  updatedAt: string
}

export function useProjects() {
  const { fetchApi } = useApi()
  const orgStore = useOrganizationStore()

  const projects = ref<Project[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Pagination state
  const page = ref(1)
  const totalPages = ref(1)
  const total = ref(0)
  const limit = ref(20)

  // Store current filter options for pagination
  const currentStatus = ref<string | undefined>(undefined)

  async function fetchProjects(status?: string, requestedPage?: number) {
    if (!orgStore.currentOrganization) return

    loading.value = true
    error.value = null

    // Store status filter for pagination
    currentStatus.value = status

    // Use requested page or current page
    const pageNum = requestedPage ?? page.value

    try {
      let url = `/api/projects?organizationId=${orgStore.currentOrganization.id}&page=${pageNum}&limit=${limit.value}`
      if (status) url += `&status=${status}`

      const response = await fetchApi<{
        success: boolean
        data: {
          projects: Project[]
          total: number
          page: number
          totalPages: number
        }
      }>(url)

      if (response.success) {
        projects.value = response.data.projects
        total.value = response.data.total
        page.value = response.data.page
        totalPages.value = response.data.totalPages
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch projects'
    } finally {
      loading.value = false
    }
  }

  async function setPage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages.value && newPage !== page.value) {
      page.value = newPage
      await fetchProjects(currentStatus.value, newPage)
    }
  }

  function resetPagination() {
    page.value = 1
    totalPages.value = 1
    total.value = 0
  }

  async function createProject(name: string, description = '') {
    if (!orgStore.currentOrganization) return

    const response = await fetchApi<{
      success: boolean
      data: { project: Project }
    }>('/api/projects', {
      method: 'POST',
      body: {
        organizationId: orgStore.currentOrganization.id,
        name,
        description,
      },
    })

    if (response.success) {
      projects.value.unshift(response.data.project)
    }

    return response
  }

  async function updateProject(
    id: string,
    data: Partial<Pick<Project, 'name' | 'description' | 'status'>>
  ) {
    const response = await fetchApi<{
      success: boolean
      data: { project: Project }
    }>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: data,
    })

    if (response.success) {
      const index = projects.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        projects.value[index] = response.data.project
      }
    }

    return response
  }

  async function deleteProject(id: string) {
    const response = await fetchApi<{ success: boolean }>(`/api/projects/${id}`, {
      method: 'DELETE',
    })

    if (response.success) {
      projects.value = projects.value.filter((p) => p.id !== id)
    }

    return response
  }

  return {
    projects,
    loading,
    error,
    // Pagination
    page,
    totalPages,
    total,
    limit,
    setPage,
    resetPagination,
    // Methods
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  }
}
