<script setup lang="ts">
interface Props {
  modelValue: string
  type?: 'text' | 'email' | 'password' | 'search'
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  required?: boolean
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  disabled: false,
  required: false,
})

const autoId = useId()
const inputId = computed(() => props.id || autoId)
const errorId = computed(() => `${inputId.value}-error`)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const inputClasses = computed(() => {
  const base =
    'block w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all duration-200'

  if (props.error) {
    return `${base} border-danger-300 text-danger-900 placeholder-danger-300 bg-danger-50/50 focus:border-danger-500 focus:ring-2 focus:ring-danger-500/20 focus:shadow-glow-danger dark:border-danger-600 dark:text-danger-400 dark:placeholder-danger-500 dark:bg-danger-900/20`
  }

  return `${base} border-gray-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:shadow-glow-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:hover:border-gray-500`
})
</script>

<template>
  <div>
    <label
      v-if="label"
      :for="inputId"
      class="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5"
    >
      {{ label }}
      <span v-if="required" class="text-danger-500 ml-0.5">*</span>
    </label>
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :aria-required="required"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? errorId : undefined"
      :class="inputClasses"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <p v-if="error" :id="errorId" class="mt-1.5 text-sm text-danger-600 dark:text-danger-400 flex items-center gap-1" role="alert">
      <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      {{ error }}
    </p>
  </div>
</template>
