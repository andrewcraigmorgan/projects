<script setup lang="ts">
interface Field {
  key: string
  label: string
  required: boolean
}

interface Props {
  taskColumns: string[]
  projectColumns: string[]
  taskColumnMap: Record<string, string>
  projectColumnMap: Record<string, string>
  systemTaskFields: Field[]
  systemProjectFields: Field[]
  hasProjectsFile: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:taskColumnMap', value: Record<string, string>): void
  (e: 'update:projectColumnMap', value: Record<string, string>): void
  (e: 'back'): void
  (e: 'continue'): void
}>()

function updateTaskMapping(field: string, value: string) {
  emit('update:taskColumnMap', { ...props.taskColumnMap, [field]: value })
}

function updateProjectMapping(field: string, value: string) {
  emit('update:projectColumnMap', { ...props.projectColumnMap, [field]: value })
}

const props = defineProps<Props>()
</script>

<template>
  <UiCard title="Map CSV Columns to Fields">
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
      Match the columns from your CSV files to the corresponding fields in our system.
    </p>

    <!-- Task field mappings -->
    <div class="mb-8">
      <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Task Fields</h3>
      <div class="grid grid-cols-2 gap-4">
        <div v-for="field in systemTaskFields" :key="field.key">
          <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">
            {{ field.label }}
            <span v-if="field.required" class="text-red-500">*</span>
          </label>
          <select
            :value="taskColumnMap[field.key] || ''"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            @change="updateTaskMapping(field.key, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">-- Select column --</option>
            <option v-for="col in taskColumns" :key="col" :value="col">
              {{ col }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Project field mappings (if file uploaded) -->
    <div v-if="hasProjectsFile" class="mb-8">
      <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Project Fields</h3>
      <div class="grid grid-cols-2 gap-4">
        <div v-for="field in systemProjectFields" :key="field.key">
          <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">
            {{ field.label }}
            <span v-if="field.required" class="text-red-500">*</span>
          </label>
          <select
            :value="projectColumnMap[field.key] || ''"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            @change="updateProjectMapping(field.key, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">-- Select column --</option>
            <option v-for="col in projectColumns" :key="col" :value="col">
              {{ col }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="flex justify-between">
      <UiButton variant="ghost" @click="emit('back')">
        Back
      </UiButton>
      <UiButton @click="emit('continue')">
        Preview Import
      </UiButton>
    </div>
  </UiCard>
</template>
