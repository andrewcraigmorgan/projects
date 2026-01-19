<script setup lang="ts">
interface Props {
  tasksFile: File | null
  projectsFile: File | null
  parsedTasksCount: number
  parsedProjectsCount: number
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'tasks-file', file: File): void
  (e: 'projects-file', file: File): void
  (e: 'continue'): void
}>()

function handleTasksFile(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    emit('tasks-file', file)
  }
}

function handleProjectsFile(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    emit('projects-file', file)
  }
}
</script>

<template>
  <div class="space-y-6">
    <UiCard title="Upload CSV Files">
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Export your data from Zoho Projects as CSV files and upload them here. At minimum, upload a tasks file.
      </p>

      <div class="space-y-4">
        <!-- Tasks file (required) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tasks CSV <span class="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept=".csv"
            class="block w-full text-sm text-gray-500 dark:text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:border-0
              file:text-sm file:font-medium
              file:bg-primary-50 file:text-primary-700
              dark:file:bg-primary-900 dark:file:text-primary-300
              hover:file:bg-primary-100 dark:hover:file:bg-primary-800
              file:cursor-pointer"
            @change="handleTasksFile"
          />
          <p v-if="tasksFile" class="mt-1 text-sm text-green-600 dark:text-green-400">
            {{ parsedTasksCount }} tasks found
          </p>
        </div>

        <!-- Projects file (optional) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Projects CSV <span class="text-gray-400">(optional)</span>
          </label>
          <input
            type="file"
            accept=".csv"
            class="block w-full text-sm text-gray-500 dark:text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:border-0
              file:text-sm file:font-medium
              file:bg-gray-100 file:text-gray-700
              dark:file:bg-gray-700 dark:file:text-gray-300
              hover:file:bg-gray-200 dark:hover:file:bg-gray-600
              file:cursor-pointer"
            @change="handleProjectsFile"
          />
          <p v-if="projectsFile" class="mt-1 text-sm text-green-600 dark:text-green-400">
            {{ parsedProjectsCount }} projects found
          </p>
          <p class="mt-1 text-xs text-gray-400">
            If not provided, projects will be created from task data
          </p>
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <UiButton
          :disabled="!tasksFile"
          @click="emit('continue')"
        >
          Continue to Field Mapping
        </UiButton>
      </div>
    </UiCard>

    <!-- Zoho export instructions -->
    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-6">
      <h3 class="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
        How to export from Zoho Projects
      </h3>
      <ol class="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
        <li>Go to your Zoho Projects portal</li>
        <li>Navigate to the project you want to export</li>
        <li>Click on Tasks &gt; More Options &gt; Export to CSV</li>
        <li>For projects, go to Projects &gt; Export</li>
        <li>Upload the exported CSV files above</li>
      </ol>
    </div>
  </div>
</template>
