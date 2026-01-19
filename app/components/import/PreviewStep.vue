<script setup lang="ts">
interface PreviewTask {
  title: string
  project: string
  status: string
  priority: string | null
  dueDate: string
}

interface Props {
  previewTasks: PreviewTask[]
  totalTasks: number
  totalProjects: number
  organizationName: string
  importing: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'import'): void
}>()
</script>

<template>
  <UiCard title="Preview Import">
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
      Review how your data will be imported. Showing first 10 tasks.
    </p>

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Due Date</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="(task, idx) in previewTasks" :key="idx">
            <td class="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{{ task.title }}</td>
            <td class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{{ task.project }}</td>
            <td class="px-4 py-2 text-sm">
              <span class="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {{ task.status }}
              </span>
            </td>
            <td class="px-4 py-2 text-sm">
              <span
                v-if="task.priority"
                class="px-2 py-0.5 text-xs font-medium"
                :class="{
                  'bg-gray-100 text-gray-600': task.priority === 'low',
                  'bg-blue-100 text-blue-600': task.priority === 'medium',
                  'bg-orange-100 text-orange-600': task.priority === 'high',
                }"
              >
                {{ task.priority }}
              </span>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{{ task.dueDate || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-4 p-4 bg-gray-50 dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-400">
      <strong>Summary:</strong>
      {{ totalTasks }} tasks
      <span v-if="totalProjects">, {{ totalProjects }} projects</span>
      will be imported into <strong>{{ organizationName }}</strong>
    </div>

    <div class="mt-6 flex justify-between">
      <UiButton variant="ghost" @click="emit('back')">
        Back
      </UiButton>
      <UiButton
        :loading="importing"
        @click="emit('import')"
      >
        Start Import
      </UiButton>
    </div>
  </UiCard>
</template>
