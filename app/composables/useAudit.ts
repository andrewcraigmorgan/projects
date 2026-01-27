import { useApi } from './useApi'

export interface AuditActor {
  userId: string
  email: string
  name: string
  authMethod?: 'session' | 'api_key'
}

export interface AuditResource {
  type: string
  id: string
  name?: string
}

export interface AuditChange {
  field: string
  oldValue?: unknown
  newValue?: unknown
}

export interface AuditLog {
  id: string
  actor: AuditActor
  action: string
  resource: AuditResource
  organization: string
  project?: string
  changes?: AuditChange[]
  metadata?: Record<string, unknown>
  ip?: string
  userAgent?: string
  createdAt: string
}

export interface AuditFilters {
  resourceType?: string
  action?: string
  userId?: string
  startDate?: string
  endDate?: string
}

export function useAudit(projectId: Ref<string>) {
  const { fetchApi } = useApi()

  const logs = ref<AuditLog[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const total = ref(0)
  const page = ref(1)
  const limit = ref(50)
  const totalPages = computed(() => Math.ceil(total.value / limit.value))

  async function fetchAuditLogs(filters: AuditFilters = {}) {
    loading.value = true
    error.value = null

    try {
      const params = new URLSearchParams({
        projectId: projectId.value,
        page: page.value.toString(),
        limit: limit.value.toString(),
      })

      if (filters.resourceType) {
        params.set('resourceType', filters.resourceType)
      }
      if (filters.action) {
        params.set('action', filters.action)
      }
      if (filters.userId) {
        params.set('userId', filters.userId)
      }
      if (filters.startDate) {
        params.set('startDate', filters.startDate)
      }
      if (filters.endDate) {
        params.set('endDate', filters.endDate)
      }

      const response = await fetchApi<{
        success: boolean
        data: {
          logs: AuditLog[]
          total: number
          page: number
          limit: number
          totalPages: number
        }
      }>(`/api/audit?${params.toString()}`)

      if (response.success) {
        logs.value = response.data.logs
        total.value = response.data.total
        page.value = response.data.page
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch audit logs'
    } finally {
      loading.value = false
    }
  }

  function setPage(newPage: number) {
    page.value = newPage
  }

  return {
    logs,
    loading,
    error,
    total,
    page,
    limit,
    totalPages,
    fetchAuditLogs,
    setPage,
  }
}
