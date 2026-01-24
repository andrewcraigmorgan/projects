<script setup lang="ts">
export interface FilterOption {
  value: string
  label: string
  color?: string
}

interface Props {
  modelValue: string[]
  options: FilterOption[]
  label: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'All',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const buttonRef = ref<HTMLButtonElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const dropdownStyle = ref({ top: '0px', left: '0px', minWidth: '180px' })

// Update dropdown position when opening
function updateDropdownPosition() {
  if (!buttonRef.value) return
  const rect = buttonRef.value.getBoundingClientRect()
  dropdownStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    minWidth: `${Math.max(180, rect.width)}px`,
  }
}

function handleButtonClick() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    updateDropdownPosition()
  }
}

const selectedCount = computed(() => props.modelValue.length)

const displayText = computed(() => {
  if (selectedCount.value === 0) return props.placeholder
  if (selectedCount.value === 1) {
    const opt = props.options.find(o => o.value === props.modelValue[0])
    return opt?.label || props.modelValue[0]
  }
  return `${selectedCount.value} selected`
})

function toggleOption(value: string) {
  const newValue = props.modelValue.includes(value)
    ? props.modelValue.filter(v => v !== value)
    : [...props.modelValue, value]
  emit('update:modelValue', newValue)
}

function selectAll() {
  emit('update:modelValue', props.options.map(o => o.value))
}

function clearAll() {
  emit('update:modelValue', [])
}

// Close on click outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node
  const isInsideContainer = containerRef.value && containerRef.value.contains(target)
  const isInsideDropdown = dropdownRef.value && dropdownRef.value.contains(target)

  if (!isInsideContainer && !isInsideDropdown) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="containerRef" class="relative">
    <button
      ref="buttonRef"
      type="button"
      class="flex items-center gap-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 focus:ring-1 focus:ring-primary-500 focus:outline-none transition-colors"
      :class="{ 'border-primary-500 dark:border-primary-500': selectedCount > 0 }"
      @click="handleButtonClick"
    >
      <span class="truncate max-w-[120px]">{{ displayText }}</span>
      <svg
        class="h-4 w-4 text-gray-400 transition-transform"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown (teleported to body to avoid overflow clipping) -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="dropdownRef"
        class="fixed z-[100] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg"
        :style="dropdownStyle"
      >
      <!-- Header with select/clear all -->
      <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ label }}</span>
        <div class="flex gap-2">
          <button
            type="button"
            class="text-xs text-primary-600 dark:text-primary-400 hover:underline"
            @click="selectAll"
          >
            All
          </button>
          <button
            type="button"
            class="text-xs text-gray-500 dark:text-gray-400 hover:underline"
            @click="clearAll"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- Options -->
      <div class="max-h-64 overflow-y-auto py-1">
        <label
          v-for="option in options"
          :key="option.value"
          class="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
        >
          <input
            type="checkbox"
            :checked="modelValue.includes(option.value)"
            class="h-4 w-4 rounded text-primary-600 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 checked:bg-primary-600 dark:checked:bg-primary-500 focus:ring-primary-500 focus:ring-offset-0 dark:focus:ring-offset-gray-800"
            @change="toggleOption(option.value)"
          />
          <span
            v-if="option.color"
            class="h-2 w-2 rounded-full"
            :class="option.color"
          />
          <span class="text-sm text-gray-700 dark:text-gray-300">{{ option.label }}</span>
        </label>
      </div>
    </div>
    </Teleport>
  </div>
</template>
