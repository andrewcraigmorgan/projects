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
        class="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold transition-all duration-200"
        :class="[
          isCurrent(idx)
            ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/40'
            : isCompleted(idx)
              ? 'bg-gradient-to-br from-success-500 to-success-600 text-white shadow-lg shadow-success-500/30'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
        ]"
        role="img"
        :aria-label="isCompleted(idx) ? `Step ${idx + 1}: ${step.label} - completed` : `Step ${idx + 1}: ${step.label}`"
      >
        <svg v-if="isCompleted(idx)" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span v-else aria-hidden="true">{{ idx + 1 }}</span>
      </div>
      <span
        class="ml-3 text-sm transition-colors duration-200"
        :class="isCurrent(idx) ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-500 dark:text-gray-400'"
        :aria-current="isCurrent(idx) ? 'step' : undefined"
      >
        {{ step.label }}
      </span>
      <div
        v-if="idx < normalizedSteps.length - 1"
        class="w-12 h-1 mx-4 rounded-full transition-colors duration-200"
        :class="isCompleted(idx)
          ? 'bg-gradient-to-r from-success-500 to-success-400'
          : 'bg-gray-200 dark:bg-gray-700'"
      />
    </div>
  </div>
</template>
