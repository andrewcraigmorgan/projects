import { useApi } from './useApi'
import { useAuthStore } from '~/stores/auth'
import type { Task } from './useTasks'

export function useMyTasks() {
  const { fetchApi } = useApi()
  const authStore = useAuthStore()

  const tasks = ref<Task[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTasks(options: {
    status?: string | string[]
    priority?: string | string[]
    projectId?: string
    dueDateFrom?: string
    dueDateTo?: string
  } = {}) {
    if (!authStore.user?.id) {
      error.value = 'User not authenticated'
      return
    }

    loading.value = true
    error.value = null

    try {
      // Build URL with current user as assignee filter
      let url = `/api/tasks?assignees=${authStore.user.id}`

      if (options.status) {
        const statusStr = Array.isArray(options.status) ? options.status.join(',') : options.status
        if (statusStr) url += `&status=${statusStr}`
      }
      if (options.priority) {
        const priorityStr = Array.isArray(options.priority) ? options.priority.join(',') : options.priority
        if (priorityStr) url += `&priority=${priorityStr}`
      }
      if (options.projectId) url += `&projectId=${options.projectId}`
      if (options.dueDateFrom) url += `&dueDateFrom=${options.dueDateFrom}`
      if (options.dueDateTo) url += `&dueDateTo=${options.dueDateTo}`

      const response = await fetchApi<{
        success: boolean
        data: { tasks: Task[] }
      }>(url)

      if (response.success) {
        tasks.value = response.data.tasks
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch tasks'
    } finally {
      loading.value = false
    }
  }

  async function updateTask(
    taskId: string,
    data: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority'>> & {
      assignees?: string[]
      dueDate?: string | null
    }
  ) {
    // Convert YYYY-MM-DD to ISO 8601 datetime format
    function toISODateTime(dateStr: string | undefined | null): string | null | undefined {
      if (dateStr === null) return null
      if (!dateStr) return undefined
      if (dateStr.includes('T')) return dateStr
      return `${dateStr}T00:00:00.000Z`
    }

    const response = await fetchApi<{
      success: boolean
      data: { task: Task }
    }>(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: {
        ...data,
        dueDate: data.dueDate !== undefined ? toISODateTime(data.dueDate) : undefined,
      },
    })

    if (response.success) {
      const index = tasks.value.findIndex((t) => t.id === taskId)
      if (index !== -1) {
        tasks.value[index] = response.data.task
      }
    }

    return response
  }

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    updateTask,
  }
}
