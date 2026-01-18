<script setup lang="ts">
import type { Task } from '~/composables/useTasks'

interface Props {
  tasks: Task[]
  loading?: boolean
  depth?: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  depth: 0,
})

const emit = defineEmits<{
  (e: 'select', task: Task): void
  (e: 'load-subtasks', task: Task): void
}>()

const expandedTasks = ref<Set<string>>(new Set())
const loadedSubtasks = ref<Map<string, Task[]>>(new Map())

async function toggleExpand(task: Task) {
  if (expandedTasks.value.has(task.id)) {
    expandedTasks.value.delete(task.id)
  } else {
    expandedTasks.value.add(task.id)
    if (!loadedSubtasks.value.has(task.id)) {
      emit('load-subtasks', task)
    }
  }
}

defineExpose({
  setSubtasks(taskId: string, subtasks: Task[]) {
    loadedSubtasks.value.set(taskId, subtasks)
  },
})
</script>

<template>
  <div class="space-y-2">
    <div v-if="loading" class="text-center py-8">
      <svg
        class="animate-spin h-8 w-8 mx-auto text-primary-600"
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
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>

    <div v-else-if="tasks.length === 0" class="text-center py-8 text-gray-500">
      No tasks found
    </div>

    <template v-else>
      <div v-for="task in tasks" :key="task.id">
        <TaskCard
          :task="{ ...task, subtasks: loadedSubtasks.get(task.id) }"
          :depth="depth"
          @click="emit('select', $event)"
          @toggle-expand="toggleExpand"
        >
          <template #subtasks="{ subtasks }">
            <TaskList
              :tasks="subtasks"
              :depth="depth + 1"
              @select="emit('select', $event)"
              @load-subtasks="emit('load-subtasks', $event)"
            />
          </template>
        </TaskCard>
      </div>
    </template>
  </div>
</template>
