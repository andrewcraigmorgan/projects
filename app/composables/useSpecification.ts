import { useApi } from './useApi'

export interface SpecificationTask {
  id: string
  taskNumber: number
  title: string
  description: string
  status: string
  priority: string
  assignees: Array<{
    id: string
    name: string
    email: string
    avatar?: string
  }>
  dueDate: string | null
  milestone: { id: string; name: string } | null
  subtasks: SpecificationTask[]
}

export interface SpecificationSignoff {
  id: string
  signedBy: {
    id: string
    name: string
    email: string
  }
  signedAt: string
  notes: string
}

export interface SpecificationMilestone {
  id: string
  name: string
  description: string
  startDate: string | null
  endDate: string | null
  status: string
  isLocked: boolean
  lockedAt: string | null
  lockedBy: { id: string; name: string } | null
  signoffStatus: {
    status: 'pending' | 'partial' | 'complete'
    totalApprovers: number
    signedCount: number
    signoffs: SpecificationSignoff[]
  }
  tasks: SpecificationTask[]
  taskStats: {
    total: number
    completed: number
  }
}

export interface SpecificationApprover {
  id: string
  user: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  addedAt: string
}

export interface Specification {
  project: {
    id: string
    name: string
    code: string
    description: string
    owner: { id: string; name: string }
  }
  generatedAt: string
  approvers: SpecificationApprover[]
  milestones: SpecificationMilestone[]
  unassignedTasks: {
    tasks: SpecificationTask[]
    taskStats: { total: number; completed: number }
  } | null
}

export function useSpecification(projectId: Ref<string>) {
  const { fetchApi } = useApi()

  const specification = ref<Specification | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchSpecification() {
    loading.value = true
    error.value = null
    try {
      const response = await fetchApi<{
        success: boolean
        data: { specification: Specification }
      }>(`/api/projects/${projectId.value}/specification`)

      if (response.success) {
        specification.value = response.data.specification
      } else {
        error.value = 'Failed to load specification'
      }
    } catch (e) {
      error.value = 'Failed to load specification'
      console.error('Error fetching specification:', e)
    } finally {
      loading.value = false
    }
  }

  async function downloadPdf() {
    try {
      const response = await $fetch(`/api/projects/${projectId.value}/specification/pdf`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        responseType: 'blob',
      })

      // Create download link
      const blob = new Blob([response as Blob], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${specification.value?.project.code || 'project'}-specification.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (e) {
      console.error('Error downloading PDF:', e)
      throw e
    }
  }

  return {
    specification,
    loading,
    error,
    fetchSpecification,
    downloadPdf,
  }
}

export function useSpecificationApprovers(projectId: Ref<string>) {
  const { fetchApi } = useApi()

  const approvers = ref<SpecificationApprover[]>([])
  const loading = ref(false)

  async function fetchApprovers() {
    loading.value = true
    try {
      const response = await fetchApi<{
        success: boolean
        data: { approvers: SpecificationApprover[] }
      }>(`/api/projects/${projectId.value}/approvers`)

      if (response.success) {
        approvers.value = response.data.approvers
      }
    } catch (e) {
      console.error('Error fetching approvers:', e)
    } finally {
      loading.value = false
    }
  }

  async function addApprover(userId: string) {
    const response = await fetchApi<{
      success: boolean
      data: { approver: SpecificationApprover }
    }>(`/api/projects/${projectId.value}/approvers`, {
      method: 'POST',
      body: { userId },
    })

    if (response.success) {
      approvers.value.push(response.data.approver)
    }
    return response
  }

  async function removeApprover(userId: string) {
    const response = await fetchApi<{ success: boolean }>(
      `/api/projects/${projectId.value}/approvers/${userId}`,
      { method: 'DELETE' }
    )

    if (response.success) {
      approvers.value = approvers.value.filter(a => a.user.id !== userId)
    }
    return response
  }

  return {
    approvers,
    loading,
    fetchApprovers,
    addApprover,
    removeApprover,
  }
}

export function useMilestoneSignoff(milestoneId: Ref<string>) {
  const { fetchApi } = useApi()

  const signoffStatus = ref<{
    status: 'pending' | 'partial' | 'complete'
    totalApprovers: number
    signedCount: number
    isLocked: boolean
    lockedAt: string | null
  } | null>(null)
  const signoffs = ref<SpecificationSignoff[]>([])
  const approvers = ref<Array<{
    id: string
    user: { id: string; name: string; email: string; avatar?: string }
    hasSigned: boolean
    signedAt: string | null
  }>>([])
  const loading = ref(false)

  async function fetchSignoffStatus() {
    loading.value = true
    try {
      const response = await fetchApi<{
        success: boolean
        data: {
          status: typeof signoffStatus.value
          signoffs: SpecificationSignoff[]
          approvers: typeof approvers.value
        }
      }>(`/api/milestones/${milestoneId.value}/signoff`)

      if (response.success) {
        signoffStatus.value = response.data.status
        signoffs.value = response.data.signoffs
        approvers.value = response.data.approvers
      }
    } catch (e) {
      console.error('Error fetching signoff status:', e)
    } finally {
      loading.value = false
    }
  }

  async function signOff(notes?: string) {
    const response = await fetchApi<{
      success: boolean
      data: {
        signoff: SpecificationSignoff
        milestoneNowLocked: boolean
        signoffProgress: { signed: number; total: number }
      }
    }>(`/api/milestones/${milestoneId.value}/signoff`, {
      method: 'POST',
      body: { notes },
    })

    if (response.success) {
      await fetchSignoffStatus()
    }
    return response
  }

  async function revokeSignoff(signoffId: string) {
    const response = await fetchApi<{
      success: boolean
      milestoneUnlocked: boolean
    }>(`/api/milestones/${milestoneId.value}/signoff/${signoffId}`, {
      method: 'DELETE',
    })

    if (response.success) {
      await fetchSignoffStatus()
    }
    return response
  }

  return {
    signoffStatus,
    signoffs,
    approvers,
    loading,
    fetchSignoffStatus,
    signOff,
    revokeSignoff,
  }
}
