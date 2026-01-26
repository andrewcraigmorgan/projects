import { useApi } from './useApi'

export interface Milestone {
  id: string
  name: string
  description?: string
  startDate: string
  endDate: string
  status: 'pending' | 'active' | 'completed'
  isLocked: boolean
  lockedAt: string | null
  projectId: string
  taskStats: {
    total: number
    completed: number
  }
  createdAt: string
  updatedAt: string
}

export function useMilestones(projectId: Ref<string>) {
  const { fetchApi } = useApi()

  const milestones = ref<Milestone[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchMilestones() {
    loading.value = true
    error.value = null

    try {
      const response = await fetchApi<{
        success: boolean
        data: { milestones: Milestone[] }
      }>(`/api/milestones?projectId=${projectId.value}`)

      if (response.success) {
        milestones.value = response.data.milestones
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch milestones'
    } finally {
      loading.value = false
    }
  }

  async function createMilestone(data: {
    name: string
    description?: string
    startDate: string
    endDate: string
    status?: Milestone['status']
  }) {
    const response = await fetchApi<{
      success: boolean
      data: { milestone: Milestone }
    }>('/api/milestones', {
      method: 'POST',
      body: {
        projectId: projectId.value,
        ...data,
      },
    })

    if (response.success) {
      milestones.value.push(response.data.milestone)
    }

    return response
  }

  async function updateMilestone(
    milestoneId: string,
    data: Partial<Pick<Milestone, 'name' | 'description' | 'startDate' | 'endDate' | 'status'>>
  ) {
    const response = await fetchApi<{
      success: boolean
      data: { milestone: Milestone }
    }>(`/api/milestones/${milestoneId}`, {
      method: 'PATCH',
      body: data,
    })

    if (response.success) {
      const index = milestones.value.findIndex((m) => m.id === milestoneId)
      if (index !== -1) {
        milestones.value[index] = response.data.milestone
      }
    }

    return response
  }

  async function deleteMilestone(milestoneId: string) {
    const response = await fetchApi<{ success: boolean }>(`/api/milestones/${milestoneId}`, {
      method: 'DELETE',
    })

    if (response.success) {
      milestones.value = milestones.value.filter((m) => m.id !== milestoneId)
    }

    return response
  }

  return {
    milestones,
    loading,
    error,
    fetchMilestones,
    createMilestone,
    updateMilestone,
    deleteMilestone,
  }
}
