<script setup lang="ts">
import { useTasks, type Task } from '~/composables/useTasks'

interface Props {
  projectId: string
  parentTaskId?: string
  status?: Task['status']
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  parentTaskId: undefined,
  status: 'todo',
  placeholder: 'Add a task... (press Enter)',
})

const emit = defineEmits<{
  (e: 'created', task: Task): void
}>()

const { createTask } = useTasks(computed(() => props.projectId))

const title = ref('')
const loading = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

async function handleSubmit() {
  const trimmedTitle = title.value.trim()
  if (!trimmedTitle || loading.value) return

  loading.value = true
  try {
    const response = await createTask({
      title: trimmedTitle,
      status: props.status,
      parentTask: props.parentTaskId,
    })

    if (response.success) {
      emit('created', response.data.task)
      title.value = ''
    }
  } finally {
    loading.value = false
    inputRef.value?.focus()
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="relative">
    <input
      ref="inputRef"
      v-model="title"
      type="text"
      :placeholder="placeholder"
      :disabled="loading"
      class="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
    />
    <div
      v-if="loading"
      class="absolute right-3 top-1/2 -translate-y-1/2"
    >
      <svg
        class="animate-spin h-4 w-4 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  </form>
</template>
