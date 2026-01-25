<script setup lang="ts">
import type { Tag } from '~/composables/useTags'

interface Props {
  tag: Tag
  colors: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update', tagId: string, data: Partial<Pick<Tag, 'name' | 'color'>>): void
  (e: 'delete', tagId: string): void
}>()

const isEditingName = ref(false)
const editedName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)
const showColorPicker = ref(false)

function startEditingName() {
  editedName.value = props.tag.name
  isEditingName.value = true
  nextTick(() => {
    nameInput.value?.focus()
    nameInput.value?.select()
  })
}

function saveName() {
  if (editedName.value.trim() && editedName.value !== props.tag.name) {
    emit('update', props.tag.id, { name: editedName.value.trim() })
  }
  isEditingName.value = false
}

function cancelEditName() {
  isEditingName.value = false
  editedName.value = ''
}

function selectColor(color: string) {
  if (color !== props.tag.color) {
    emit('update', props.tag.id, { color })
  }
  showColorPicker.value = false
}

function handleDelete() {
  if (confirm('Are you sure you want to delete this tag? It will be removed from all tasks.')) {
    emit('delete', props.tag.id)
  }
}
</script>

<template>
  <div
    class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all"
  >
    <div class="p-4">
      <!-- Header row -->
      <div class="flex items-center gap-4">
        <!-- Color swatch with picker -->
        <div class="relative">
          <button
            class="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            :style="{ backgroundColor: tag.color }"
            title="Change color"
            aria-label="Change tag color"
            :aria-expanded="showColorPicker"
            aria-haspopup="true"
            @click="showColorPicker = !showColorPicker"
          />

          <!-- Color picker dropdown -->
          <div
            v-if="showColorPicker"
            class="absolute left-0 top-full mt-2 p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-lg z-10"
          >
            <div class="grid grid-cols-3 gap-2" role="listbox" aria-label="Color options">
              <button
                v-for="color in colors"
                :key="color"
                role="option"
                :aria-selected="color === tag.color"
                :aria-label="`Color ${color}`"
                class="w-8 h-8 rounded-full border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500"
                :class="color === tag.color ? 'border-gray-800 dark:border-gray-100 scale-110' : 'border-transparent hover:scale-110'"
                :style="{ backgroundColor: color }"
                @click="selectColor(color)"
              />
            </div>
          </div>
        </div>

        <!-- Editable name -->
        <div class="flex-1 min-w-0">
          <div v-if="isEditingName" class="flex items-center gap-2">
            <input
              ref="nameInput"
              v-model="editedName"
              type="text"
              aria-label="Tag name"
              class="flex-1 px-2 py-1 text-lg font-semibold bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              @keydown.enter="saveName"
              @keydown.escape="cancelEditName"
              @blur="saveName"
            />
          </div>
          <button
            v-else
            type="button"
            class="group/title text-lg font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 inline-flex items-center gap-2 text-left"
            :aria-label="`Edit tag name: ${tag.name}`"
            @click.stop="startEditingName"
          >
            {{ tag.name }}
            <svg
              class="h-4 w-4 text-gray-400 opacity-0 group-hover/title:opacity-100 transition-opacity"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-4 flex items-center justify-end text-xs text-gray-500 dark:text-gray-400">
        <button
          class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
          :aria-label="`Delete tag ${tag.name}`"
          @click="handleDelete"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>
