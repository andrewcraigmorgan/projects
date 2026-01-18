import { useAuthStore } from '~/stores/auth'

export function useApi() {
  const authStore = useAuthStore()

  async function fetchApi<T>(
    url: string,
    options: RequestInit & { body?: unknown } = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (authStore.token) {
      headers.Authorization = `Bearer ${authStore.token}`
    }

    return $fetch<T>(url, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  }

  return { fetchApi }
}
