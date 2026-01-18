<script setup lang="ts">
interface Option {
  id: string
  label: string
}

interface Props {
  modelValue?: string
  options: Option[]
  placeholder?: string
  searchPlaceholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select...',
  searchPlaceholder: 'Search...',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const isOpen = ref(false)
const search = ref('')
const containerRef = ref<HTMLElement | null>(null)

const selectedOption = computed(() =>
  props.options.find(o => o.id === props.modelValue)
)

const filteredOptions = computed(() => {
  if (!search.value) return props.options
  const query = search.value.toLowerCase()
  return props.options.filter(o => o.label.toLowerCase().includes(query))
})

function select(option: Option) {
  emit('update:modelValue', option.id)
  isOpen.value = false
  search.value = ''
}

function toggle() {
  isOpen.value = !isOpen.value
  if (!isOpen.value) {
    search.value = ''
  }
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
  <div ref="containerRef" class="relative">
    <!-- Trigger button -->
    <button
      type="button"
      class="w-full flex items-center justify-between px-3 py-2 text-sm text-left bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
      @click="toggle"
    >
      <span class="truncate">{{ selectedOption?.label || placeholder }}</span>
      <svg
        class="h-4 w-4 ml-2 flex-shrink-0 transition-transform"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown -->
    <div
      v-if="isOpen"
      class="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 shadow-lg"
    >
      <!-- Search input -->
      <div class="p-2 border-b border-gray-700">
        <input
          v-model="search"
          type="text"
          :placeholder="searchPlaceholder"
          class="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          @click.stop
        />
      </div>

      <!-- Options list -->
      <div class="max-h-48 overflow-y-auto">
        <button
          v-for="option in filteredOptions"
          :key="option.id"
          type="button"
          class="w-full px-3 py-2 text-sm text-left text-white hover:bg-gray-700 flex items-center justify-between"
          :class="{ 'bg-gray-700': option.id === modelValue }"
          @click="select(option)"
        >
          <span class="truncate">{{ option.label }}</span>
          <svg
            v-if="option.id === modelValue"
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
          class="px-3 py-2 text-sm text-gray-500"
        >
          No results found
        </div>
      </div>
    </div>
  </div>
</template>
