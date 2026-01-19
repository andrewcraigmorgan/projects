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

  async function fetchProjects(status?: string) {
    if (!orgStore.currentOrganization) return

    loading.value = true
    error.value = null

    try {
      let url = `/api/projects?organizationId=${orgStore.currentOrganization.id}`
      if (status) url += `&status=${status}`

      const response = await fetchApi<{
        success: boolean
        data: { projects: Project[] }
      }>(url)

      if (response.success) {
        projects.value = response.data.projects
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch projects'
    } finally {
      loading.value = false
    }
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
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  }
}
