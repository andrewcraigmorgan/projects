import { useApi } from './useApi'

export interface Task {
  id: string
  taskNumber: number
  title: string
  description: string
  status: 'todo' | 'awaiting_approval' | 'open' | 'in_review' | 'done'
  priority?: 'low' | 'medium' | 'high'
  assignee?: { id: string; name: string; email: string; avatar?: string; role?: 'team' | 'client' }
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
    status?: string
    parentTask?: string
    rootOnly?: boolean
  } = {}) {
    loading.value = true
    error.value = null

    try {
      let url = `/api/tasks?projectId=${projectId.value}`
      if (options.status) url += `&status=${options.status}`
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

  async function moveTask(taskId: string, newParentTask: string | null, newOrder?: number) {
    const response = await fetchApi<{
      success: boolean
      data: { task: Task }
    }>(`/api/tasks/${taskId}/move`, {
      method: 'POST',
      body: { newParentTask, newOrder },
    })

    return response
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
  }
}
