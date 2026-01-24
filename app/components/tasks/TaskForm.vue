<script setup lang="ts">
import type { Task } from '~/composables/useTasks'

interface Props {
  task?: Partial<Task>
  parentTask?: Task
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  (e: 'submit', data: {
    title: string
    description: string
    status: Task['status']
    priority: Task['priority']
    dueDate?: string
    parentTask?: string
  }): void
  (e: 'cancel'): void
}>()

const form = reactive({
  title: props.task?.title || '',
  description: props.task?.description || '',
  status: props.task?.status || 'todo' as Task['status'],
  priority: props.task?.priority || 'medium' as Task['priority'],
  dueDate: props.task?.dueDate ? props.task.dueDate.split('T')[0] : '',
})

function handleSubmit() {
  if (!form.title.trim()) return

  emit('submit', {
    title: form.title.trim(),
    description: form.description.trim(),
    status: form.status,
    priority: form.priority,
    dueDate: form.dueDate || undefined,
    parentTask: props.parentTask?.id,
  })
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div class="space-y-4">
      <div v-if="parentTask" class="text-sm text-gray-500">
        Creating subtask of: <strong>{{ parentTask.title }}</strong>
      </div>

      <UiInput
        v-model="form.title"
        label="Title"
        placeholder="Task title"
        required
      />

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          v-model="form.description"
          rows="3"
          class="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-500 dark:[color-scheme:dark]"
          placeholder="Task description (optional)"
        />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            v-model="form.status"
            class="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-500 dark:[color-scheme:dark]"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Priority
          </label>
          <select
            v-model="form.priority"
            class="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-500 dark:[color-scheme:dark]"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Due Date
        </label>
        <input
          v-model="form.dueDate"
          type="date"
          class="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-500 dark:[color-scheme:dark]"
        />
      </div>
    </div>

    <div class="mt-6 flex justify-end gap-3">
      <UiButton
        type="button"
        variant="secondary"
        @click="emit('cancel')"
      >
        Cancel
      </UiButton>
      <UiButton
        type="submit"
        :loading="loading"
        :disabled="!form.title.trim()"
      >
        {{ task?.id ? 'Update' : 'Create' }} Task
      </UiButton>
    </div>
  </form>
</template>
