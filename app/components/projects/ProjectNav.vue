<script setup lang="ts">
interface Props {
  projectId: string
}

defineProps<Props>()

const route = useRoute()

// Determine which page is active
const currentPage = computed(() => {
  const path = route.path
  if (path.includes('/milestones')) return 'milestones'
  if (path.includes('/tags')) return 'tags'
  if (path.includes('/members')) return 'members'
  return 'tasks'
})
</script>

<template>
  <nav class="flex items-center gap-1" aria-label="Project sections">
    <NuxtLink
      :to="`/projects/${projectId}/milestones`"
      :aria-current="currentPage === 'milestones' ? 'page' : undefined"
      class="px-3 py-1.5 text-sm font-medium transition-colors"
      :class="currentPage === 'milestones'
        ? 'text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30'
        : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'"
    >
      Milestones
    </NuxtLink>
    <NuxtLink
      :to="`/projects/${projectId}/tags`"
      :aria-current="currentPage === 'tags' ? 'page' : undefined"
      class="px-3 py-1.5 text-sm font-medium transition-colors"
      :class="currentPage === 'tags'
        ? 'text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30'
        : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'"
    >
      Tags
    </NuxtLink>
    <NuxtLink
      :to="`/projects/${projectId}/members`"
      :aria-current="currentPage === 'members' ? 'page' : undefined"
      class="px-3 py-1.5 text-sm font-medium transition-colors"
      :class="currentPage === 'members'
        ? 'text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30'
        : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'"
    >
      Members
    </NuxtLink>
  </nav>
</template>
