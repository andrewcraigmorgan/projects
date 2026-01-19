<script setup lang="ts">
import type { Tag } from '~/composables/useTags'

interface Props {
  modelValue: Tag[]
  availableTags: Tag[]
  canCreateTags?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canCreateTags: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', tags: Tag[]): void
  (e: 'create-tag', name: string): void
}>()

const isOpen = ref(false)
const searchQuery = ref('')
const newTagName = ref('')

const selectedTagIds = computed(() => new Set(props.modelValue.map(t => t.id)))

const filteredTags = computed(() => {
  if (!searchQuery.value) return props.availableTags
  const query = searchQuery.value.toLowerCase()
  return props.availableTags.filter(tag =>
    tag.name.toLowerCase().includes(query)
  )
})

const showCreateOption = computed(() => {
  if (!props.canCreateTags || !searchQuery.value.trim()) return false
  // Show create option if no exact match exists
  return !props.availableTags.some(
    tag => tag.name.toLowerCase() === searchQuery.value.toLowerCase()
  )
})

function toggleTag(tag: Tag) {
  if (selectedTagIds.value.has(tag.id)) {
    emit('update:modelValue', props.modelValue.filter(t => t.id !== tag.id))
  } else {
    emit('update:modelValue', [...props.modelValue, tag])
  }
}

function removeTag(tag: Tag) {
  emit('update:modelValue', props.modelValue.filter(t => t.id !== tag.id))
}

function createTag() {
  const name = searchQuery.value.trim()
  if (name) {
    emit('create-tag', name)
    searchQuery.value = ''
  }
}

// Close dropdown when clicking outside
const dropdownRef = ref<HTMLElement | null>(null)

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
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
  <div ref="dropdownRef" class="relative">
    <!-- Selected tags display -->
    <div
      class="min-h-[38px] px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 cursor-pointer flex flex-wrap items-center gap-1"
      @click="isOpen = !isOpen"
    >
      <span
        v-for="tag in modelValue"
        :key="tag.id"
        class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-white"
        :style="{ backgroundColor: tag.color }"
      >
        {{ tag.name }}
        <button
          type="button"
          class="hover:opacity-75"
          @click.stop="removeTag(tag)"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </span>
      <span v-if="modelValue.length === 0" class="text-gray-400 dark:text-gray-500 text-sm">
        Select tags...
      </span>
    </div>

    <!-- Dropdown -->
    <div
      v-if="isOpen"
      class="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-lg max-h-60 overflow-auto"
    >
      <!-- Search input -->
      <div class="p-2 border-b border-gray-200 dark:border-gray-700">
        <input
          v-model="searchQuery"
          type="text"
          class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-primary-500"
          placeholder="Search or create tag..."
          @click.stop
        />
      </div>

      <!-- Tag list -->
      <div class="py-1">
        <button
          v-for="tag in filteredTags"
          :key="tag.id"
          type="button"
          class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="toggleTag(tag)"
        >
          <span
            class="w-3 h-3 flex-shrink-0"
            :style="{ backgroundColor: tag.color }"
          />
          <span class="flex-1 text-gray-900 dark:text-gray-100">{{ tag.name }}</span>
          <svg
            v-if="selectedTagIds.has(tag.id)"
            class="w-4 h-4 text-primary-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </button>

        <!-- Create new tag option -->
        <button
          v-if="showCreateOption"
          type="button"
          class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-t border-gray-200 dark:border-gray-700"
          @click="createTag"
        >
          <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span class="text-gray-700 dark:text-gray-300">
            Create "<strong>{{ searchQuery }}</strong>"
          </span>
        </button>

        <!-- Empty state -->
        <div
          v-if="filteredTags.length === 0 && !showCreateOption"
          class="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-sm"
        >
          No tags found
        </div>
      </div>
    </div>
  </div>
</template>
