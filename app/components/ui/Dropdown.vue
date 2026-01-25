<script setup lang="ts">
export interface DropdownOption {
  value: string
  label: string
  color?: string  // Optional dot/badge color
}

interface Props {
  modelValue?: string
  options: DropdownOption[]
  placeholder?: string
  searchPlaceholder?: string
  size?: 'sm' | 'md'
  variant?: 'default' | 'subtle'
  showDot?: boolean  // Show colored dot indicator
  coloredBackground?: boolean  // Apply color as full background (badge style)
  searchableThreshold?: number  // Number of options before becoming searchable (default: 5)
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Select...',
  searchPlaceholder: 'Search...',
  size: 'sm',
  variant: 'subtle',
  showDot: false,
  coloredBackground: false,
  searchableThreshold: 5,
})

// Map background color classes to their badge-style equivalents
const colorToBadgeClasses: Record<string, string> = {
  'bg-gray-400': 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200',
  'bg-gray-500': 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200',
  'bg-yellow-400': 'bg-yellow-400 text-yellow-900 dark:bg-yellow-500 dark:text-yellow-900',
  'bg-yellow-500': 'bg-yellow-400 text-yellow-900 dark:bg-yellow-500 dark:text-yellow-900',
  'bg-blue-400': 'bg-blue-400 text-blue-900 dark:bg-blue-500 dark:text-blue-100',
  'bg-blue-500': 'bg-blue-400 text-blue-900 dark:bg-blue-500 dark:text-blue-100',
  'bg-purple-400': 'bg-purple-400 text-purple-900 dark:bg-purple-500 dark:text-purple-100',
  'bg-purple-500': 'bg-purple-400 text-purple-900 dark:bg-purple-500 dark:text-purple-100',
  'bg-green-400': 'bg-green-400 text-green-900 dark:bg-green-500 dark:text-green-100',
  'bg-green-500': 'bg-green-400 text-green-900 dark:bg-green-500 dark:text-green-100',
  'bg-red-400': 'bg-red-400 text-red-900 dark:bg-red-500 dark:text-red-100',
  'bg-red-500': 'bg-red-400 text-red-900 dark:bg-red-500 dark:text-red-100',
  'bg-orange-400': 'bg-orange-400 text-orange-900 dark:bg-orange-500 dark:text-orange-100',
  'bg-orange-500': 'bg-orange-400 text-orange-900 dark:bg-orange-500 dark:text-orange-100',
}

// Get badge classes for colored background mode
const badgeClasses = computed(() => {
  if (!props.coloredBackground || !selectedOption.value?.color) return ''
  return colorToBadgeClasses[selectedOption.value.color] || ''
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const isOpen = ref(false)
const search = ref('')
const containerRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

// Determine if we should use searchable mode
const isSearchable = computed(() => props.options.length > props.searchableThreshold)

const selectedOption = computed(() =>
  props.options.find(o => o.value === props.modelValue)
)

const filteredOptions = computed(() => {
  if (!search.value) return props.options
  const query = search.value.toLowerCase()
  return props.options.filter(o => o.label.toLowerCase().includes(query))
})

// Size classes
const sizeClasses = computed(() => {
  if (props.size === 'sm') {
    return {
      trigger: 'px-2 py-1 text-xs',
      triggerPadding: props.showDot ? 'pl-5 pr-5' : 'pl-2 pr-5',
      option: 'px-2 py-1.5 text-xs',
      dot: 'h-2 w-2 left-1.5',
      chevron: 'h-3 w-3 right-1',
    }
  }
  return {
    trigger: 'px-3 py-2 text-sm',
    triggerPadding: props.showDot ? 'pl-7 pr-6' : 'pl-3 pr-6',
    option: 'px-3 py-2 text-sm',
    dot: 'h-2.5 w-2.5 left-2',
    chevron: 'h-4 w-4 right-2',
  }
})

// Variant classes
const variantClasses = computed(() => {
  if (props.variant === 'subtle') {
    return {
      trigger: 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border-0',
      dropdown: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    }
  }
  return {
    trigger: 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
    dropdown: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
  }
})

function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value && isSearchable.value) {
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
  if (!isOpen.value) {
    search.value = ''
  }
}

function select(option: DropdownOption) {
  emit('update:modelValue', option.value)
  isOpen.value = false
  search.value = ''
}

function onNativeChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}

// Close on click outside
function handleClickOutside(event: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isOpen.value = false
    search.value = ''
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
  <div ref="containerRef" class="relative inline-block">
    <!-- Native select for small option lists -->
    <template v-if="!isSearchable">
      <div class="relative">
        <div
          v-if="showDot && !coloredBackground && selectedOption?.color"
          class="absolute top-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          :class="[sizeClasses.dot, selectedOption.color]"
        />
        <select
          :value="modelValue"
          class="appearance-none font-medium cursor-pointer focus:ring-1 focus:ring-primary-500 focus:outline-none transition-colors min-w-[70px]"
          :class="[
            sizeClasses.trigger,
            coloredBackground ? 'pl-2 pr-5' : sizeClasses.triggerPadding,
            coloredBackground && badgeClasses ? badgeClasses : [variantClasses.trigger, 'text-gray-700 dark:text-gray-300']
          ]"
          @change="onNativeChange"
          @click.stop
        >
          <option v-if="placeholder && !modelValue" value="" disabled>
            {{ placeholder }}
          </option>
          <option
            v-for="option in options"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
        <svg
          class="absolute top-1/2 -translate-y-1/2 pointer-events-none"
          :class="[sizeClasses.chevron, coloredBackground ? 'text-current opacity-70' : 'text-gray-500']"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </template>

    <!-- Searchable dropdown for large option lists -->
    <template v-else>
      <button
        type="button"
        class="relative flex items-center font-medium cursor-pointer focus:ring-1 focus:ring-primary-500 focus:outline-none transition-colors"
        :class="[
          sizeClasses.trigger,
          coloredBackground ? 'pl-2 pr-5' : sizeClasses.triggerPadding,
          coloredBackground && badgeClasses ? badgeClasses : [variantClasses.trigger, 'text-gray-700 dark:text-gray-300']
        ]"
        @click.stop="toggle"
      >
        <div
          v-if="showDot && !coloredBackground && selectedOption?.color"
          class="absolute top-1/2 -translate-y-1/2 rounded-full"
          :class="[sizeClasses.dot, selectedOption.color]"
        />
        <span class="truncate">{{ selectedOption?.label || placeholder }}</span>
        <svg
          class="absolute top-1/2 -translate-y-1/2 transition-transform"
          :class="[sizeClasses.chevron, { 'rotate-180': isOpen }, coloredBackground ? 'text-current opacity-70' : 'text-gray-500']"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Dropdown panel -->
      <div
        v-if="isOpen"
        class="absolute z-50 mt-1 min-w-full w-48 shadow-lg"
        :class="variantClasses.dropdown"
      >
        <!-- Search input -->
        <div class="p-2 border-b border-gray-200 dark:border-gray-700">
          <input
            ref="searchInputRef"
            v-model="search"
            type="text"
            :placeholder="searchPlaceholder"
            class="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            @click.stop
          />
        </div>

        <!-- Options list -->
        <div class="max-h-48 overflow-y-auto">
          <button
            v-for="option in filteredOptions"
            :key="option.value"
            type="button"
            class="w-full text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            :class="[sizeClasses.option, { 'bg-gray-100 dark:bg-gray-700': option.value === modelValue }]"
            @click="select(option)"
          >
            <div
              v-if="showDot && option.color"
              class="h-2 w-2 rounded-full flex-shrink-0"
              :class="option.color"
            />
            <span class="truncate flex-1">{{ option.label }}</span>
            <svg
              v-if="option.value === modelValue"
              class="h-4 w-4 text-primary-500 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </button>

          <div
            v-if="filteredOptions.length === 0"
            class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
          >
            No results found
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
