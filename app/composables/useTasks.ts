import { useApi } from './useApi'

export interface Task {
  id: string
  taskNumber: number
  title: string
  description: string
  status: 'todo' | 'awaiting_approval' | 'open' | 'in_review' | 'done'
  priority?: 'low' | 'medium' | 'high'
  assignees?: Array<{ _id: string; id?: string; name: string; email: string; avatar?: string; role?: 'team' | 'client' }>
  dueDate?: string
  estimatedHours?: number
  isExternal?: boolean
  project?: { id: string; name: string; code: string }
  milestone?: { id: string; name: string }
  tags?: { id: string; name: string; color: string }[]
  parentTask?: string
  depth: number
  order: number
  subtaskCount: number
  subtasks?: Task[]
  createdBy: { id: string; name: string; email: string; avatar?: string }
  createdAt: string
  updatedAt: string
}

export function useTasks(projectId: Ref<string>) {
  const { fetchApi } = useApi()

  const tasks = ref<Task[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Pagination state
  const page = ref(1)
  const totalPages = ref(1)
  const total = ref(0)
  const limit = ref(50)

  // Store current filter options for pagination
  const currentFilters = ref<{
    status?: string | string[]
    priority?: string | string[]
    milestone?: string | string[]
    dueDateFrom?: string
    dueDateTo?: string
    parentTask?: string
    rootOnly?: boolean
  }>({})

  async function fetchTasks(options: {
    status?: string | string[]
    priority?: string | string[]
    milestone?: string | string[]
    dueDateFrom?: string
    dueDateTo?: string
    parentTask?: string
    rootOnly?: boolean
    page?: number
  } = {}) {
    loading.value = true
    error.value = null

    // Store filters (excluding page) for pagination
    const { page: requestedPage, ...filters } = options
    currentFilters.value = filters

    // Use requested page or current page
    const pageNum = requestedPage ?? page.value

    try {
      let url = `/api/tasks?projectId=${projectId.value}&page=${pageNum}&limit=${limit.value}`
      if (options.status) {
        const statusStr = Array.isArray(options.status) ? options.status.join(',') : options.status
        if (statusStr) url += `&status=${statusStr}`
      }
      if (options.priority) {
        const priorityStr = Array.isArray(options.priority) ? options.priority.join(',') : options.priority
        if (priorityStr) url += `&priority=${priorityStr}`
      }
      if (options.milestone) {
        const milestoneStr = Array.isArray(options.milestone) ? options.milestone.join(',') : options.milestone
        if (milestoneStr) url += `&milestone=${milestoneStr}`
      }
      if (options.dueDateFrom) url += `&dueDateFrom=${options.dueDateFrom}`
      if (options.dueDateTo) url += `&dueDateTo=${options.dueDateTo}`
      if (options.parentTask) url += `&parentTask=${options.parentTask}`
      if (options.rootOnly) url += `&rootOnly=true`

      const response = await fetchApi<{
        success: boolean
        data: {
          tasks: Task[]
          total: number
          page: number
          totalPages: number
        }
      }>(url)

      if (response.success) {
        tasks.value = response.data.tasks
        total.value = response.data.total
        page.value = response.data.page
        totalPages.value = response.data.totalPages
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch tasks'
    } finally {
      loading.value = false
    }
  }

  async function setPage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages.value && newPage !== page.value) {
      page.value = newPage
      await fetchTasks({ ...currentFilters.value, page: newPage })
    }
  }

  function resetPagination() {
    page.value = 1
    totalPages.value = 1
    total.value = 0
  }

  async function getTaskWithSubtasks(taskId: string): Promise<{
    task: Task
    ancestors: Array<{ id: string; title: string; taskNumber: number }>
  } | null> {
    try {
      const response = await fetchApi<{
        success: boolean
        data: {
          task: Task
          ancestors?: Array<{ id: string; title: string; taskNumber: number }>
        }
      }>(`/api/tasks/${taskId}?includeSubtasks=true&includeAncestors=true`)

      return response.success
        ? { task: response.data.task, ancestors: response.data.ancestors || [] }
        : null
    } catch {
      return null
    }
  }

  // Convert YYYY-MM-DD to ISO 8601 datetime format
  function toISODateTime(dateStr: string | undefined | null): string | null | undefined {
    if (dateStr === null) return null
    if (!dateStr) return undefined
    // If already in ISO format, return as-is
    if (dateStr.includes('T')) return dateStr
    // Convert YYYY-MM-DD to ISO datetime (midnight UTC)
    return `${dateStr}T00:00:00.000Z`
  }

  async function createTask(data: {
    title: string
    description?: string
    status?: Task['status']
    priority?: Task['priority']
    assignees?: string[]
    dueDate?: string
    parentTask?: string
  }) {
    const response = await fetchApi<{
      success: boolean
      data: { task: Task }
    }>('/api/tasks', {
      method: 'POST',
      body: {
        projectId: projectId.value,
        ...data,
        dueDate: toISODateTime(data.dueDate),
      },
    })

    if (response.success) {
      // Add to appropriate location based on parentTask
      if (!data.parentTask) {
        tasks.value.push(response.data.task)
      }
    }

    return response
  }

  async function updateTask(
    taskId: string,
    data: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'order'>> & {
      assignees?: string[]
      dueDate?: string | null
    }
  ) {
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

  async function deleteTask(taskId: string) {
    const response = await fetchApi<{ success: boolean }>(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    })

    if (response.success) {
      tasks.value = tasks.value.filter((t) => t.id !== taskId)
    }

    return response
  }

  interface CrossProjectMoveInfo {
    fromProject: string
    toProject: string
    clearedFields: string[]
    descendantsMoved: number
  }

  async function moveTask(
    taskId: string,
    newParentTask: string | null,
    newOrder?: number,
    newProject?: string
  ) {
    const response = await fetchApi<{
      success: boolean
      data: {
        task: Task
        crossProjectMove?: CrossProjectMoveInfo
      }
    }>(`/api/tasks/${taskId}/move`, {
      method: 'POST',
      body: { newParentTask, newOrder, newProject },
    })

    // For cross-project moves, remove the task from the local list
    if (response.success && response.data.crossProjectMove) {
      tasks.value = tasks.value.filter((t) => t.id !== taskId)
    }

    return response
  }

  async function reorderTask(taskId: string, newOrder: number) {
    // Find the task to get its current parent
    const task = tasks.value.find((t) => t.id === taskId)
    if (!task) return { success: false }

    return moveTask(taskId, task.parentTask || null, newOrder)
  }

  return {
    tasks,
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
    fetchTasks,
    getTaskWithSubtasks,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    reorderTask,
  }
}
