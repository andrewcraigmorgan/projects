<script setup lang="ts">
import { useApi } from '~/composables/useApi'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const { fetchApi } = useApi()

const projectId = computed(() => route.params.id as string)

// Project data (for header)
const project = ref<{ name: string; code: string } | null>(null)
const projectLoading = ref(true)

async function loadProject() {
  projectLoading.value = true
  try {
    const response = await fetchApi<{
      success: boolean
      data: { project: { name: string; code: string } }
    }>(`/api/projects/${projectId.value}`)

    if (response.success) {
      project.value = response.data.project
    }
  } catch {
    // Handled by ProjectMembers component
  } finally {
    projectLoading.value = false
  }
}

useHead({
  title: computed(() => project.value?.name ? `Members - ${project.value.name}` : 'Members'),
})

onMounted(loadProject)
</script>

<template>
  <div>
    <LayoutHeader :back-link="`/projects/${projectId}`">
      <template #title>
        <div v-if="projectLoading" class="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div v-else class="min-w-0">
          <h1 class="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 truncate">
            Members
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ project?.name }}
          </p>
        </div>
      </template>
    </LayoutHeader>

    <div class="p-4 sm:p-6 max-w-2xl">
      <ProjectsProjectMembers
        :project-id="projectId"
      />
    </div>
  </div>
</template>
