import { useApi } from './useApi'

export interface Task {
  id: string
  taskNumber: number
  title: string
  description: string
  status: 'todo' | 'awaiting_approval' | 'open' | 'in_review' | 'done'
  priority?: 'low' | 'medium' | 'high'
  assignee?: { _id: string; id?: string; name: string; email: string; avatar?: string; role?: 'team' | 'client' }
  dueDate?: string
  estimatedHours?: number
  isExternal?: boolean
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

  async function fetchTasks(options: {
    status?: string | string[]
    priority?: string | string[]
    dueDateFrom?: string
    dueDateTo?: string
    parentTask?: string
    rootOnly?: boolean
  } = {}) {
    loading.value = true
    error.value = null

    try {
      let url = `/api/tasks?projectId=${projectId.value}`
      if (options.status) {
        const statusStr = Array.isArray(options.status) ? options.status.join(',') : options.status
        if (statusStr) url += `&status=${statusStr}`
      }
      if (options.priority) {
        const priorityStr = Array.isArray(options.priority) ? options.priority.join(',') : options.priority
        if (priorityStr) url += `&priority=${priorityStr}`
      }
      if (options.dueDateFrom) url += `&dueDateFrom=${options.dueDateFrom}`
      if (options.dueDateTo) url += `&dueDateTo=${options.dueDateTo}`
      if (options.parentTask) url += `&parentTask=${options.parentTask}`
      if (options.rootOnly) url += `&rootOnly=true`

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

  async function getTaskWithSubtasks(taskId: string): Promise<Task | null> {
    try {
      const response = await fetchApi<{
        success: boolean
        data: { task: Task }
      }>(`/api/tasks/${taskId}?includeSubtasks=true`)

      return response.success ? response.data.task : null
    } catch {
      return null
    }
  }

  async function createTask(data: {
    title: string
    description?: string
    status?: Task['status']
    priority?: Task['priority']
    assignee?: string
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
      assignee?: string | null
      dueDate?: string | null
    }
  ) {
    const response = await fetchApi<{
      success: boolean
      data: { task: Task }
    }>(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: data,
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
    fetchTasks,
    getTaskWithSubtasks,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    reorderTask,
  }
}
