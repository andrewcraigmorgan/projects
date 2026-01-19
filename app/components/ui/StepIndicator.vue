<script setup lang="ts">
interface Step {
  id: string
  label: string
}

interface Props {
  steps: (Step | string)[]
  currentStep?: string
  currentStepIndex?: number
}

const props = defineProps<Props>()

// Normalize steps to always have label
const normalizedSteps = computed(() =>
  props.steps.map((s, idx) =>
    typeof s === 'string' ? { id: String(idx), label: s } : s
  )
)

const currentIndex = computed(() => {
  if (props.currentStepIndex !== undefined) {
    return props.currentStepIndex
  }
  if (props.currentStep) {
    return normalizedSteps.value.findIndex(s => s.id === props.currentStep)
  }
  return 0
})

function isCompleted(index: number): boolean {
  return currentIndex.value > index
}

function isCurrent(index: number): boolean {
  return currentIndex.value === index
}
</script>

<template>
  <div class="flex items-center justify-between">
    <div
      v-for="(step, idx) in normalizedSteps"
      :key="step.id"
      class="flex items-center"
    >
      <div
        class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
        :class="isCurrent(idx) || isCompleted(idx)
          ? 'bg-primary-600 text-white'
          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'"
      >
        <svg v-if="isCompleted(idx)" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span v-else>{{ idx + 1 }}</span>
      </div>
      <span
        class="ml-2 text-sm"
        :class="isCurrent(idx) ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-500 dark:text-gray-400'"
      >
        {{ step.label }}
      </span>
      <div
        v-if="idx < normalizedSteps.length - 1"
        class="w-12 h-0.5 mx-4"
        :class="isCompleted(idx) ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'"
      />
    </div>
  </div>
</template>
