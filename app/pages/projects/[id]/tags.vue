<script setup lang="ts">
import { useApi } from '~/composables/useApi'
import { useTags, type Tag } from '~/composables/useTags'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const { fetchApi } = useApi()

const projectId = computed(() => route.params.id as string)

// Project data
const project = ref<{
  id: string
  name: string
  description: string
  status: string
} | null>(null)

const projectLoading = ref(true)
const projectError = ref(false)

// Tags
const {
  tags,
  loading: tagsLoading,
  tagColors,
  fetchTags,
  createTag,
  updateTag,
  deleteTag,
} = useTags(projectId)

// Create tag modal
const showCreateModal = ref(false)
const newTag = ref({
  name: '',
  color: '',
})
const creating = ref(false)

// Fetch project
async function loadProject() {
  projectLoading.value = true
  projectError.value = false
  try {
    const response = await fetchApi<{
      success: boolean
      data: { project: typeof project.value }
    }>(`/api/projects/${projectId.value}`)

    if (response.success) {
      project.value = response.data.project
    } else {
      projectError.value = true
    }
  } catch {
    projectError.value = true
  } finally {
    projectLoading.value = false
  }
}

// Handle tag update
async function handleUpdate(tagId: string, data: Partial<Pick<Tag, 'name' | 'color'>>) {
  await updateTag(tagId, data)
}

// Handle tag deletion
async function handleDelete(tagId: string) {
  await deleteTag(tagId)
}

// Handle create tag
async function handleCreate() {
  if (!newTag.value.name) {
    return
  }

  creating.value = true
  try {
    await createTag(newTag.value.name, newTag.value.color || undefined)
    showCreateModal.value = false
    newTag.value = { name: '', color: '' }
  } finally {
    creating.value = false
  }
}

// Set page title
useHead({
  title: computed(() => project.value?.name ? `Tags - ${project.value.name}` : 'Tags'),
})

// Initial load
onMounted(async () => {
  await loadProject()
  await fetchTags()
})
</script>

<template>
  <div>
    <LayoutHeader :back-link="`/projects/${projectId}`">
      <template #title>
        <div v-if="projectLoading" class="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div v-else>
          <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Tags
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ project?.name }}
          </p>
        </div>
      </template>
      <template #actions>
        <UiButton @click="showCreateModal = true">
          New Tag
        </UiButton>
      </template>
    </LayoutHeader>

    <div class="p-6">
      <!-- Error state -->
      <div v-if="projectError" class="text-center py-12">
        <p class="text-gray-500 dark:text-gray-400 mb-4">Project not found</p>
        <NuxtLink to="/projects" class="text-primary-600 dark:text-primary-400 hover:underline">
          Back to Projects
        </NuxtLink>
      </div>

      <!-- Loading state -->
      <UiLoadingSpinner v-else-if="tagsLoading" />

      <!-- Empty state -->
      <UiEmptyState
        v-else-if="tags.length === 0"
        title="No tags"
        description="Get started by creating a new tag."
      >
        <template #icon>
          <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </template>
        <template #actions>
          <UiButton @click="showCreateModal = true">
            New Tag
          </UiButton>
        </template>
      </UiEmptyState>

      <!-- Tags list -->
      <div v-else class="space-y-4">
        <TagsTagCard
          v-for="tag in tags"
          :key="tag.id"
          :tag="tag"
          :colors="tagColors"
          @update="handleUpdate"
          @delete="handleDelete"
        />
      </div>
    </div>

    <!-- Create Tag Modal -->
    <UiModal
      :open="showCreateModal"
      title="Create Tag"
      @close="showCreateModal = false"
    >
      <form class="space-y-4" @submit.prevent="handleCreate">
        <div>
          <label for="tag-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name *
          </label>
          <input
            id="tag-name"
            v-model="newTag.name"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Tag name"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Color (optional)
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="color in tagColors"
              :key="color"
              type="button"
              class="w-8 h-8 rounded-full border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500"
              :class="newTag.color === color ? 'border-gray-800 dark:border-gray-100 scale-110' : 'border-transparent hover:scale-110'"
              :style="{ backgroundColor: color }"
              @click="newTag.color = color"
            />
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Leave empty for a random color
          </p>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <UiButton
            type="button"
            variant="secondary"
            @click="showCreateModal = false"
          >
            Cancel
          </UiButton>
          <UiButton
            type="submit"
            :loading="creating"
          >
            Create Tag
          </UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>
