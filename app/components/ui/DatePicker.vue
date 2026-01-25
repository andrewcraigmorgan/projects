<script setup lang="ts">
interface Props {
  modelValue: string | null | undefined
  placeholder?: string
  size?: 'sm' | 'md'
  clearable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Set date',
  size: 'sm',
  clearable: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLDivElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)

// Format date for display (dd/mm/yyyy)
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Quick date options
function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function getTomorrow(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

function getNextWeek(): string {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toISOString().slice(0, 10)
}

function getNextMonth(): string {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  return date.toISOString().slice(0, 10)
}

function selectDate(dateStr: string) {
  emit('update:modelValue', dateStr)
  isOpen.value = false
}

function clearDate() {
  emit('update:modelValue', null)
  isOpen.value = false
}

function handleCustomDate(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.value) {
    emit('update:modelValue', input.value)
    isOpen.value = false
  }
}

// Close on click outside
function handleClickOutside(event: MouseEvent) {
  if (
    dropdownRef.value &&
    !dropdownRef.value.contains(event.target as Node) &&
    triggerRef.value &&
    !triggerRef.value.contains(event.target as Node)
  ) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Check if date is overdue
const isOverdue = computed(() => {
  if (!props.modelValue) return false
  const date = new Date(props.modelValue)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
})

// Check if date is today
const isToday = computed(() => {
  if (!props.modelValue) return false
  const date = new Date(props.modelValue)
  const today = new Date()
  return date.toDateString() === today.toDateString()
})
</script>

<template>
  <div class="relative inline-block">
    <!-- Trigger button -->
    <button
      ref="triggerRef"
      type="button"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      :aria-label="modelValue ? `Due date: ${formatDate(modelValue)}${isOverdue ? ', overdue' : ''}${isToday ? ', today' : ''}` : placeholder"
      class="inline-flex items-center gap-1.5 transition-colors"
      :class="[
        size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5',
        modelValue
          ? isOverdue
            ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20'
            : isToday
              ? 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
          : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
      ]"
      @click.stop="isOpen = !isOpen"
    >
      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span>{{ modelValue ? formatDate(modelValue) : placeholder }}</span>
    </button>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        ref="dropdownRef"
        class="absolute z-50 mt-1 left-0 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg"
      >
        <!-- Quick options -->
        <div class="py-1" role="group" aria-label="Quick date options">
          <button
            type="button"
            class="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
            @click="selectDate(getToday())"
          >
            <span>Today</span>
            <span class="text-xs text-gray-400 dark:text-gray-500" aria-hidden="true">{{ new Date().toLocaleDateString('en-US', { weekday: 'short' }) }}</span>
          </button>
          <button
            type="button"
            class="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
            @click="selectDate(getTomorrow())"
          >
            <span>Tomorrow</span>
            <span class="text-xs text-gray-400 dark:text-gray-500" aria-hidden="true">{{ new Date(Date.now() + 86400000).toLocaleDateString('en-US', { weekday: 'short' }) }}</span>
          </button>
          <button
            type="button"
            class="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
            @click="selectDate(getNextWeek())"
          >
            <span>Next week</span>
            <span class="text-xs text-gray-400 dark:text-gray-500" aria-hidden="true">{{ new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}</span>
          </button>
          <button
            type="button"
            class="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
            @click="selectDate(getNextMonth())"
          >
            <span>Next month</span>
            <span class="text-xs text-gray-400 dark:text-gray-500" aria-hidden="true">{{ new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}</span>
          </button>
        </div>

        <!-- Custom date picker -->
        <div class="border-t border-gray-200 dark:border-gray-700 px-3 py-2">
          <label for="custom-date-input" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Custom date</label>
          <input
            id="custom-date-input"
            type="date"
            :value="modelValue?.slice(0, 10) || ''"
            class="w-full text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 dark:[color-scheme:dark]"
            @change="handleCustomDate"
          />
        </div>

        <!-- Clear button -->
        <div v-if="clearable && modelValue" class="border-t border-gray-200 dark:border-gray-700 py-1">
          <button
            type="button"
            class="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            @click="clearDate"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Clear date</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
