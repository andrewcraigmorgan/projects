<script setup lang="ts">
import { useClickOutside } from '~/composables/useClickOutside'

export interface SelectOption {
  value: string
  label: string
  color?: string // For dots/badges (Tailwind class like 'bg-blue-400' or hex color)
}

interface Props {
  // Core
  modelValue?: string | string[] // Single value or array for multi
  options: SelectOption[]
  placeholder?: string
  searchPlaceholder?: string

  // Mode
  multiple?: boolean // Multi-select mode
  searchable?: boolean | 'auto' // 'auto' = threshold-based
  searchableThreshold?: number

  // Display
  size?: 'sm' | 'md'
  variant?: 'default' | 'subtle' | 'dark'
  showDot?: boolean // Show colored dot indicator
  coloredBackground?: boolean // Apply color as full background (badge style)

  // Multi-select features
  showSelectAll?: boolean // Show Select All/Clear buttons
  showChips?: boolean // Show selected as chips (like TagSelector)
  label?: string // Label shown in dropdown header (for multi-select)

  // Creation
  creatable?: boolean
  createLabel?: string

  // Accessibility
  ariaLabel?: string // Accessible name for the trigger button
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Select...',
  searchPlaceholder: 'Search...',
  multiple: false,
  searchable: 'auto',
  searchableThreshold: 5,
  size: 'sm',
  variant: 'subtle',
  showDot: false,
  coloredBackground: false,
  showSelectAll: false,
  showChips: false,
  creatable: false,
  createLabel: 'Create',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | string[]): void
  (e: 'create', value: string): void
}>()

// Refs
const isOpen = ref(false)
const search = ref('')
const containerRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const buttonRef = ref<HTMLButtonElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const dropdownStyle = ref({ top: '0px', left: '0px', minWidth: '180px' })

// Generate unique IDs for ARIA
const listboxId = useId()

// Use click outside composable
useClickOutside([containerRef, dropdownRef], () => {
  if (isOpen.value) {
    isOpen.value = false
    search.value = ''
  }
})

// Computed: Normalize modelValue to array for internal use
const selectedValues = computed<string[]>(() => {
  if (props.multiple) {
    return Array.isArray(props.modelValue) ? props.modelValue : []
  }
  return props.modelValue ? [props.modelValue as string] : []
})

const selectedSet = computed(() => new Set(selectedValues.value))

// Determine if we should use searchable mode
const isSearchable = computed(() => {
  if (props.searchable === true) return true
  if (props.searchable === false) return false
  return props.options.length > props.searchableThreshold
})

// Use native select for non-searchable single-select (better UX on mobile)
const useNativeSelect = computed(() => {
  return !props.multiple && !isSearchable.value && !props.showChips
})

// Use teleport for multi-select to avoid overflow clipping
const useTeleport = computed(() => {
  return props.multiple || props.showChips
})

// Selected option (for single-select display)
const selectedOption = computed(() =>
  props.options.find((o) => o.value === props.modelValue)
)

// Selected options (for multi-select display)
const selectedOptions = computed(() =>
  props.options.filter((o) => selectedSet.value.has(o.value))
)

// Filtered options based on search
const filteredOptions = computed(() => {
  if (!search.value) return props.options
  const query = search.value.toLowerCase()
  return props.options.filter((o) => o.label.toLowerCase().includes(query))
})

// Display text for trigger button
const displayText = computed(() => {
  if (props.showChips) {
    return selectedValues.value.length === 0 ? props.placeholder : ''
  }
  if (props.multiple) {
    const count = selectedValues.value.length
    if (count === 0) return props.placeholder
    if (count === 1) {
      const opt = props.options.find((o) => o.value === selectedValues.value[0])
      return opt?.label || selectedValues.value[0]
    }
    return `${count} selected`
  }
  return selectedOption.value?.label || props.placeholder
})

// Show create option when searching
const showCreateOption = computed(() => {
  if (!props.creatable || !search.value.trim()) return false
  return !props.options.some(
    (opt) => opt.label.toLowerCase() === search.value.toLowerCase()
  )
})

// Map background color classes to their badge-style equivalents
const colorToBadgeClasses: Record<string, string> = {
  'bg-gray-400': 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200',
  'bg-gray-500': 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200',
  'bg-yellow-400':
    'bg-yellow-400 text-yellow-900 dark:bg-yellow-500 dark:text-yellow-900',
  'bg-yellow-500':
    'bg-yellow-400 text-yellow-900 dark:bg-yellow-500 dark:text-yellow-900',
  'bg-blue-400':
    'bg-blue-400 text-blue-900 dark:bg-blue-500 dark:text-blue-100',
  'bg-blue-500':
    'bg-blue-400 text-blue-900 dark:bg-blue-500 dark:text-blue-100',
  'bg-purple-400':
    'bg-purple-400 text-purple-900 dark:bg-purple-500 dark:text-purple-100',
  'bg-purple-500':
    'bg-purple-400 text-purple-900 dark:bg-purple-500 dark:text-purple-100',
  'bg-green-400':
    'bg-green-400 text-green-900 dark:bg-green-500 dark:text-green-100',
  'bg-green-500':
    'bg-green-400 text-green-900 dark:bg-green-500 dark:text-green-100',
  'bg-red-400': 'bg-red-400 text-red-900 dark:bg-red-500 dark:text-red-100',
  'bg-red-500': 'bg-red-400 text-red-900 dark:bg-red-500 dark:text-red-100',
  'bg-orange-400':
    'bg-orange-400 text-orange-900 dark:bg-orange-500 dark:text-orange-100',
  'bg-orange-500':
    'bg-orange-400 text-orange-900 dark:bg-orange-500 dark:text-orange-100',
}

// Get badge classes for colored background mode
const badgeClasses = computed(() => {
  if (!props.coloredBackground || !selectedOption.value?.color) return ''
  return colorToBadgeClasses[selectedOption.value.color] || ''
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
  if (props.variant === 'dark') {
    return {
      trigger:
        'bg-gray-800 border border-gray-700 text-white hover:bg-gray-700',
      dropdown: 'bg-gray-800 border border-gray-700',
      input:
        'bg-gray-900 border border-gray-600 text-white placeholder-gray-500',
      optionText: 'text-white',
      optionHover: 'hover:bg-gray-700',
      optionSelected: 'bg-gray-700',
    }
  }
  if (props.variant === 'subtle') {
    return {
      trigger:
        'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border-0 text-gray-700 dark:text-gray-300',
      dropdown:
        'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
      input:
        'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500',
      optionText: 'text-gray-700 dark:text-gray-300',
      optionHover: 'hover:bg-gray-100 dark:hover:bg-gray-700',
      optionSelected: 'bg-gray-100 dark:bg-gray-700',
    }
  }
  // default
  return {
    trigger:
      'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300',
    dropdown:
      'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    input:
      'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500',
    optionText: 'text-gray-700 dark:text-gray-300',
    optionHover: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    optionSelected: 'bg-gray-100 dark:bg-gray-700',
  }
})

// Update dropdown position when opening (for teleported dropdowns)
function updateDropdownPosition() {
  if (!buttonRef.value) return
  const rect = buttonRef.value.getBoundingClientRect()
  dropdownStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    minWidth: `${Math.max(180, rect.width)}px`,
  }
}

// Toggle dropdown
function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    if (useTeleport.value) {
      updateDropdownPosition()
    }
    if (isSearchable.value) {
      nextTick(() => {
        searchInputRef.value?.focus()
      })
    }
  } else {
    search.value = ''
  }
}

// Select an option (single-select)
function selectSingle(option: SelectOption) {
  emit('update:modelValue', option.value)
  isOpen.value = false
  search.value = ''
}

// Toggle an option (multi-select)
function toggleOption(value: string) {
  if (props.multiple) {
    const currentValues = selectedValues.value
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value]
    emit('update:modelValue', newValues)
  } else {
    const option = props.options.find((o) => o.value === value)
    if (option) selectSingle(option)
  }
}

// Remove a chip (for showChips mode)
function removeChip(value: string) {
  if (props.multiple) {
    emit(
      'update:modelValue',
      selectedValues.value.filter((v) => v !== value)
    )
  }
}

// Select all options
function selectAll() {
  if (props.multiple) {
    emit(
      'update:modelValue',
      props.options.map((o) => o.value)
    )
  }
}

// Clear all selections
function clearAll() {
  if (props.multiple) {
    emit('update:modelValue', [])
  }
}

// Create new option
function createOption() {
  const name = search.value.trim()
  if (name) {
    emit('create', name)
    search.value = ''
  }
}

// Handle native select change
function onNativeChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}

// Check if color is a hex value or Tailwind class
function isHexColor(color: string): boolean {
  return color.startsWith('#')
}

// Get color style for hex colors
function getColorStyle(color?: string) {
  if (color && isHexColor(color)) {
    return { backgroundColor: color }
  }
  return {}
}

// Get color class for Tailwind colors
function getColorClass(color?: string) {
  if (color && !isHexColor(color)) {
    return color
  }
  return ''
}
</script>

<template>
  <div ref="containerRef" class="relative" :class="{ 'inline-block': !showChips }">
    <!-- Native select for simple single-select -->
    <template v-if="useNativeSelect">
      <div class="relative">
        <div
          v-if="showDot && !coloredBackground && selectedOption?.color"
          class="absolute top-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          :class="[sizeClasses.dot, getColorClass(selectedOption.color)]"
          :style="getColorStyle(selectedOption.color)"
        />
        <select
          :value="modelValue"
          :aria-label="placeholder"
          class="appearance-none font-medium cursor-pointer focus:ring-2 focus:ring-primary-500/50 focus:outline-none transition-all duration-200 min-w-[70px] rounded-lg"
          :class="[
            sizeClasses.trigger,
            coloredBackground ? 'pl-2 pr-5' : sizeClasses.triggerPadding,
            coloredBackground && badgeClasses
              ? badgeClasses
              : variantClasses.trigger,
          ]"
          @change="onNativeChange"
          @click.stop
        >
          <option v-if="placeholder && !modelValue" value="" disabled>
            {{ placeholder }}
          </option>
          <option v-for="option in options" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <svg
          class="absolute top-1/2 -translate-y-1/2 pointer-events-none"
          :class="[
            sizeClasses.chevron,
            coloredBackground ? 'text-current opacity-70' : 'text-gray-500',
          ]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </template>

    <!-- Custom dropdown for searchable/multi-select -->
    <template v-else>
      <!-- Chips display mode trigger -->
      <div
        v-if="showChips"
        ref="buttonRef"
        class="min-h-[38px] px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 cursor-pointer flex flex-wrap items-center gap-1"
        @click="toggle"
      >
        <span
          v-for="opt in selectedOptions"
          :key="opt.value"
          class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-white"
          :class="getColorClass(opt.color)"
          :style="opt.color ? (isHexColor(opt.color) ? { backgroundColor: opt.color } : {}) : { backgroundColor: '#6b7280' }"
        >
          {{ opt.label }}
          <button
            type="button"
            class="hover:opacity-75"
            :aria-label="`Remove ${opt.label}`"
            @click.stop="removeChip(opt.value)"
          >
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </span>
        <span
          v-if="selectedOptions.length === 0"
          class="text-gray-400 dark:text-gray-500 text-sm"
        >
          {{ placeholder }}
        </span>
      </div>

      <!-- Standard trigger button -->
      <button
        v-else
        ref="buttonRef"
        type="button"
        role="combobox"
        :aria-label="ariaLabel || placeholder"
        :aria-expanded="isOpen"
        aria-haspopup="listbox"
        :aria-controls="isOpen ? listboxId : undefined"
        class="relative flex items-center font-medium cursor-pointer focus:ring-2 focus:ring-primary-500/50 focus:outline-none transition-all duration-200 rounded-lg"
        :class="[
          sizeClasses.trigger,
          coloredBackground ? 'pl-2 pr-5' : sizeClasses.triggerPadding,
          coloredBackground && badgeClasses
            ? badgeClasses
            : variantClasses.trigger,
          { 'border-primary-500 dark:border-primary-500': multiple && selectedValues.length > 0 },
        ]"
        @click.stop="toggle"
      >
        <div
          v-if="showDot && !coloredBackground && selectedOption?.color"
          class="absolute top-1/2 -translate-y-1/2 rounded-full"
          :class="[sizeClasses.dot, getColorClass(selectedOption.color)]"
          :style="getColorStyle(selectedOption.color)"
        />
        <span class="truncate">{{ displayText }}</span>
        <svg
          class="absolute top-1/2 -translate-y-1/2 transition-transform"
          :class="[
            sizeClasses.chevron,
            { 'rotate-180': isOpen },
            coloredBackground ? 'text-current opacity-70' : 'text-gray-500',
          ]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <!-- Dropdown panel (teleported for multi-select/chips to avoid overflow issues) -->
      <Teleport v-if="useTeleport" to="body">
        <div
          v-if="isOpen"
          ref="dropdownRef"
          class="fixed z-[100] shadow-elevated rounded-xl"
          :class="variantClasses.dropdown"
          :style="dropdownStyle"
        >
          <!-- Header with label and select/clear all (multi-select) -->
          <div
            v-if="multiple && showSelectAll && label"
            class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700"
          >
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              {{ label }}
            </span>
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

          <!-- Search input -->
          <div
            v-if="isSearchable || creatable"
            class="p-2 border-b border-gray-200 dark:border-gray-700"
          >
            <input
              ref="searchInputRef"
              v-model="search"
              type="text"
              :placeholder="creatable ? 'Search or create...' : searchPlaceholder"
              :aria-label="creatable ? 'Search or create option' : 'Search options'"
              class="w-full px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              :class="variantClasses.input"
              @click.stop
            />
          </div>

          <!-- Options list -->
          <div :id="listboxId" class="max-h-48 overflow-y-auto py-1" role="listbox" :aria-multiselectable="multiple">
            <!-- Multi-select with checkboxes -->
            <template v-if="multiple">
              <label
                v-for="option in filteredOptions"
                :key="option.value"
                role="option"
                :aria-selected="selectedSet.has(option.value)"
                class="flex items-center gap-2 px-3 py-1.5 cursor-pointer"
                :class="variantClasses.optionHover"
              >
                <input
                  type="checkbox"
                  :checked="selectedSet.has(option.value)"
                  class="h-4 w-4 rounded text-primary-600 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 checked:bg-primary-600 dark:checked:bg-primary-500 focus:ring-primary-500 focus:ring-offset-0 dark:focus:ring-offset-gray-800"
                  @change="toggleOption(option.value)"
                />
                <span
                  v-if="option.color"
                  class="h-2 w-2 rounded-full flex-shrink-0"
                  :class="getColorClass(option.color)"
                  :style="getColorStyle(option.color)"
                  aria-hidden="true"
                />
                <span class="text-sm" :class="variantClasses.optionText">
                  {{ option.label }}
                </span>
              </label>
            </template>

            <!-- Single-select with buttons -->
            <template v-else>
              <button
                v-for="option in filteredOptions"
                :key="option.value"
                type="button"
                role="option"
                :aria-selected="option.value === modelValue"
                class="w-full text-left flex items-center gap-2"
                :class="[
                  sizeClasses.option,
                  variantClasses.optionText,
                  variantClasses.optionHover,
                  { [variantClasses.optionSelected]: option.value === modelValue },
                ]"
                @click="selectSingle(option)"
              >
                <span
                  v-if="showDot && option.color"
                  class="h-2 w-2 rounded-full flex-shrink-0"
                  :class="getColorClass(option.color)"
                  :style="getColorStyle(option.color)"
                  aria-hidden="true"
                />
                <span class="truncate flex-1">{{ option.label }}</span>
                <svg
                  v-if="option.value === modelValue"
                  class="h-4 w-4 text-primary-500 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
            </template>

            <!-- Create new option -->
            <button
              v-if="showCreateOption"
              type="button"
              class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 border-t border-gray-200 dark:border-gray-700"
              :class="[variantClasses.optionHover]"
              @click="createOption"
            >
              <svg
                class="w-4 h-4 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span :class="variantClasses.optionText">
                {{ createLabel }} "<strong>{{ search }}</strong>"
              </span>
            </button>

            <!-- Empty state -->
            <div
              v-if="filteredOptions.length === 0 && !showCreateOption"
              class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
            >
              No results found
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Non-teleported dropdown (for inline positioning) -->
      <div
        v-else-if="isOpen"
        class="absolute z-50 mt-1 min-w-full w-48 shadow-elevated rounded-xl"
        :class="variantClasses.dropdown"
      >
        <!-- Search input -->
        <div
          v-if="isSearchable"
          class="p-2 border-b border-gray-200 dark:border-gray-700"
        >
          <input
            ref="searchInputRef"
            v-model="search"
            type="text"
            :placeholder="searchPlaceholder"
            aria-label="Search options"
            class="w-full px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            :class="variantClasses.input"
            @click.stop
          />
        </div>

        <!-- Options list -->
        <div :id="listboxId" class="max-h-48 overflow-y-auto" role="listbox">
          <button
            v-for="option in filteredOptions"
            :key="option.value"
            type="button"
            role="option"
            :aria-selected="option.value === modelValue"
            class="w-full text-left flex items-center gap-2"
            :class="[
              sizeClasses.option,
              variantClasses.optionText,
              variantClasses.optionHover,
              { [variantClasses.optionSelected]: option.value === modelValue },
            ]"
            @click="selectSingle(option)"
          >
            <span
              v-if="showDot && option.color"
              class="h-2 w-2 rounded-full flex-shrink-0"
              :class="getColorClass(option.color)"
              :style="getColorStyle(option.color)"
              aria-hidden="true"
            />
            <span class="truncate flex-1">{{ option.label }}</span>
            <svg
              v-if="option.value === modelValue"
              class="h-4 w-4 text-primary-500 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
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
