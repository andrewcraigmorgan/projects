import { useApi } from './useApi'

export interface Tag {
  id: string
  name: string
  color: string
  projectId: string
  createdAt: string
}

const TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
]

export function useTags(projectId: Ref<string>) {
  const { fetchApi } = useApi()

  const tags = ref<Tag[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTags() {
    loading.value = true
    error.value = null

    try {
      const response = await fetchApi<{
        success: boolean
        data: { tags: Tag[] }
      }>(`/api/tags?projectId=${projectId.value}`)

      if (response.success) {
        tags.value = response.data.tags
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch tags'
    } finally {
      loading.value = false
    }
  }

  async function createTag(name: string, color?: string) {
    const tagColor = color || TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]

    const response = await fetchApi<{
      success: boolean
      data: { tag: Tag }
    }>('/api/tags', {
      method: 'POST',
      body: {
        projectId: projectId.value,
        name,
        color: tagColor,
      },
    })

    if (response.success) {
      tags.value.push(response.data.tag)
    }

    return response
  }

  async function updateTag(tagId: string, data: Partial<Pick<Tag, 'name' | 'color'>>) {
    const response = await fetchApi<{
      success: boolean
      data: { tag: Tag }
    }>(`/api/tags/${tagId}`, {
      method: 'PATCH',
      body: data,
    })

    if (response.success) {
      const index = tags.value.findIndex((t) => t.id === tagId)
      if (index !== -1) {
        tags.value[index] = response.data.tag
      }
    }

    return response
  }

  async function deleteTag(tagId: string) {
    const response = await fetchApi<{ success: boolean }>(`/api/tags/${tagId}`, {
      method: 'DELETE',
    })

    if (response.success) {
      tags.value = tags.value.filter((t) => t.id !== tagId)
    }

    return response
  }

  return {
    tags,
    loading,
    error,
    tagColors: TAG_COLORS,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
  }
}
