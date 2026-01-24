import { useApi } from './useApi'

export interface CommentAuthor {
  _id: string
  name: string
  email: string
  avatar?: string
}

export interface Comment {
  id: string
  task: string
  author: CommentAuthor | null
  authorEmail?: string
  authorName?: string
  content: string
  source: 'app' | 'email'
  createdAt: string
  updatedAt: string
}

export function useComments(taskId: Ref<string>) {
  const { fetchApi } = useApi()

  const comments = ref<Comment[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchComments() {
    loading.value = true
    error.value = null

    try {
      const response = await fetchApi<{
        success: boolean
        data: { comments: Comment[] }
      }>(`/api/tasks/${taskId.value}/comments`)

      if (response.success) {
        comments.value = response.data.comments
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch comments'
    } finally {
      loading.value = false
    }
  }

  async function addComment(content: string) {
    const response = await fetchApi<{
      success: boolean
      data: { comment: Comment }
    }>(`/api/tasks/${taskId.value}/comments`, {
      method: 'POST',
      body: { content },
    })

    if (response.success) {
      comments.value.push(response.data.comment)
    }

    return response
  }

  async function updateComment(commentId: string, content: string) {
    const response = await fetchApi<{
      success: boolean
      data: { comment: Comment }
    }>(`/api/tasks/${taskId.value}/comments/${commentId}`, {
      method: 'PATCH',
      body: { content },
    })

    if (response.success) {
      const index = comments.value.findIndex((c) => c.id === commentId)
      if (index !== -1) {
        comments.value[index] = response.data.comment
      }
    }

    return response
  }

  async function deleteComment(commentId: string) {
    const response = await fetchApi<{ success: boolean }>(
      `/api/tasks/${taskId.value}/comments/${commentId}`,
      {
        method: 'DELETE',
      }
    )

    if (response.success) {
      comments.value = comments.value.filter((c) => c.id !== commentId)
    }

    return response
  }

  return {
    comments,
    loading,
    error,
    fetchComments,
    addComment,
    updateComment,
    deleteComment,
  }
}
