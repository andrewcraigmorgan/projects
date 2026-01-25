<script setup lang="ts">
import type { Milestone } from '~/composables/useMilestones'

interface Props {
  milestone: Milestone
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update', milestoneId: string, data: Partial<Milestone>): void
  (e: 'delete', milestoneId: string): void
  (e: 'click', milestone: Milestone): void
}>()

const isEditingName = ref(false)
const editedName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-400' },
  { value: 'active', label: 'Active', color: 'bg-blue-400' },
  { value: 'completed', label: 'Completed', color: 'bg-green-400' },
] as const

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
}

const progressPercentage = computed(() => {
  if (props.milestone.taskStats.total === 0) return 0
  return Math.round((props.milestone.taskStats.completed / props.milestone.taskStats.total) * 100)
})

const progressBarColor = computed(() => {
  if (progressPercentage.value === 100) return 'bg-green-500'
  if (progressPercentage.value >= 75) return 'bg-blue-500'
  if (progressPercentage.value >= 50) return 'bg-yellow-500'
  return 'bg-gray-400'
})

function startEditingName() {
  editedName.value = props.milestone.name
  isEditingName.value = true
  nextTick(() => {
    nameInput.value?.focus()
    nameInput.value?.select()
  })
}

function saveName() {
  if (editedName.value.trim() && editedName.value !== props.milestone.name) {
    emit('update', props.milestone.id, { name: editedName.value.trim() })
  }
  isEditingName.value = false
}

function cancelEditName() {
  isEditingName.value = false
  editedName.value = ''
}

function onStatusChange(event: Event) {
  event.stopPropagation()
  const target = event.target as HTMLSelectElement
  emit('update', props.milestone.id, { status: target.value as Milestone['status'] })
}

function onStartDateChange(event: Event) {
  event.stopPropagation()
  const target = event.target as HTMLInputElement
  emit('update', props.milestone.id, { startDate: target.value })
}

function onEndDateChange(event: Event) {
  event.stopPropagation()
  const target = event.target as HTMLInputElement
  emit('update', props.milestone.id, { endDate: target.value })
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>

<template>
  <div
    class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all"
  >
    <div class="p-4">
      <!-- Header row -->
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1 min-w-0">
          <!-- Editable name -->
          <div v-if="isEditingName" class="flex items-center gap-2">
            <input
              ref="nameInput"
              v-model="editedName"
              type="text"
              class="flex-1 px-2 py-1 text-lg font-semibold bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              @keydown.enter="saveName"
              @keydown.escape="cancelEditName"
              @blur="saveName"
            />
          </div>
          <h3
            v-else
            class="group/title text-lg font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 inline-flex items-center gap-2"
            title="Click to edit"
            @click.stop="startEditingName"
          >
            {{ milestone.name }}
            <svg
              class="h-4 w-4 text-gray-400 opacity-0 group-hover/title:opacity-100 transition-opacity"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </h3>

          <!-- Description -->
          <p
            v-if="milestone.description"
            class="mt-1 text-sm text-gray-500 dark:text-gray-400"
          >
            {{ milestone.description }}
          </p>
        </div>

        <!-- Status dropdown -->
        <div class="relative flex-shrink-0">
          <div
            class="absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full pointer-events-none"
            :class="statusOptions.find(s => s.value === milestone.status)?.color"
          />
          <select
            :value="milestone.status"
            class="appearance-none pl-5 pr-6 py-1 text-sm font-medium border-0 cursor-pointer focus:ring-1 focus:ring-primary-500 transition-colors"
            :class="statusColors[milestone.status]"
            @click.stop
            @change="onStatusChange"
          >
            <option
              v-for="option in statusOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <svg
            class="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <!-- Dates row -->
      <div class="mt-4 flex items-center gap-4 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 dark:text-gray-400">Start:</span>
          <input
            type="date"
            :value="milestone.startDate.split('T')[0]"
            class="px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500 cursor-pointer"
            @click.stop
            @change="onStartDateChange"
          />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 dark:text-gray-400">End:</span>
          <input
            type="date"
            :value="milestone.endDate.split('T')[0]"
            class="px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500 cursor-pointer"
            @click.stop
            @change="onEndDateChange"
          />
        </div>
      </div>

      <!-- Progress section -->
      <div class="mt-4">
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm text-gray-600 dark:text-gray-400">
            Progress
          </span>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ milestone.taskStats.completed }} / {{ milestone.taskStats.total }} tasks
            <span class="text-gray-500">({{ progressPercentage }}%)</span>
          </span>
        </div>
        <div
          class="w-full h-2 bg-gray-200 dark:bg-gray-700 overflow-hidden"
          role="progressbar"
          :aria-valuenow="progressPercentage"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`${progressPercentage}% complete`"
        >
          <div
            class="h-full transition-all duration-300"
            :class="progressBarColor"
            :style="{ width: `${progressPercentage}%` }"
          />
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          {{ formatDate(milestone.startDate) }} - {{ formatDate(milestone.endDate) }}
        </span>
        <div class="flex items-center gap-3">
          <NuxtLink
            :to="`/projects/${milestone.projectId}?milestone=${milestone.id}`"
            class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors"
            @click.stop
          >
            View Tasks
          </NuxtLink>
          <button
            class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
            @click.stop="emit('delete', milestone.id)"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
