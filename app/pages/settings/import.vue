<script setup lang="ts">
import { useApi } from '~/composables/useApi'
import { useOrganizationStore } from '~/stores/organization'

definePageMeta({
  layout: 'default',
})

const { fetchApi } = useApi()
const orgStore = useOrganizationStore()

// Import state
const step = ref<'upload' | 'mapping' | 'preview' | 'importing' | 'complete'>('upload')
const importing = ref(false)
const error = ref<string | null>(null)

// File data
const projectsFile = ref<File | null>(null)
const tasksFile = ref<File | null>(null)
const milestonesFile = ref<File | null>(null)

// Parsed data
const parsedProjects = ref<any[]>([])
const parsedTasks = ref<any[]>([])
const parsedMilestones = ref<any[]>([])

// Column mappings
const projectColumnMap = ref<Record<string, string>>({})
const taskColumnMap = ref<Record<string, string>>({})

// Available columns from CSV
const projectColumns = ref<string[]>([])
const taskColumns = ref<string[]>([])

// Our system's fields
const systemProjectFields = [
  { key: 'name', label: 'Project Name', required: true },
  { key: 'description', label: 'Description', required: false },
  { key: 'status', label: 'Status', required: false },
]

const systemTaskFields = [
  { key: 'title', label: 'Task Title', required: true },
  { key: 'description', label: 'Description', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'priority', label: 'Priority', required: false },
  { key: 'dueDate', label: 'Due Date', required: false },
  { key: 'assignee', label: 'Assignee (Name or Email)', required: false },
  { key: 'projectName', label: 'Project Name', required: true },
  { key: 'parentTask', label: 'Parent Task', required: false },
  { key: 'milestone', label: 'Milestone', required: false },
  { key: 'tags', label: 'Tags', required: false },
  { key: 'workHours', label: 'Work/Estimated Hours', required: false },
  { key: 'percentComplete', label: '% Complete', required: false },
]

// Import results
const importResults = ref<{
  projects: { created: number; errors: string[] }
  tasks: { created: number; errors: string[] }
  milestones: { created: number; errors: string[] }
  tags: { created: number; errors: string[] }
} | null>(null)

// File handlers
function handleProjectsFile(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    projectsFile.value = file
    parseCSV(file, 'projects')
  }
}

function handleTasksFile(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    tasksFile.value = file
    parseCSV(file, 'tasks')
  }
}

function handleMilestonesFile(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    milestonesFile.value = file
  }
}

// CSV parsing
function parseCSV(file: File, type: 'projects' | 'tasks') {
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length === 0) return

    // Parse header
    const headers = parseCSVLine(lines[0])

    if (type === 'projects') {
      projectColumns.value = headers
      // Auto-map common Zoho column names
      autoMapColumns(headers, projectColumnMap, 'project')
    } else {
      taskColumns.value = headers
      autoMapColumns(headers, taskColumnMap, 'task')
    }

    // Parse data rows
    const data = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      const row: Record<string, string> = {}
      headers.forEach((header, idx) => {
        row[header] = values[idx] || ''
      })
      data.push(row)
    }

    if (type === 'projects') {
      parsedProjects.value = data
    } else {
      parsedTasks.value = data
    }
  }
  reader.readAsText(file)
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function autoMapColumns(headers: string[], columnMap: Ref<Record<string, string>>, type: 'project' | 'task') {
  const zohoMappings: Record<string, string[]> = {
    // Project mappings
    name: ['Project Name', 'Name', 'Title', 'project_name'],
    description: ['Description', 'Details', 'project_description'],
    status: ['Status', 'State', 'project_status', 'Custom Status'],
    // Task mappings
    title: ['Task Name', 'Name', 'Title', 'Subject', 'task_name'],
    priority: ['Priority', 'task_priority'],
    dueDate: ['Due Date', 'End Date', 'Deadline', 'due_date', 'end_date'],
    assignee: ['Assignee', 'Assigned To', 'Owner', 'assignee_email', 'owner_email'],
    projectName: ['Project Name', 'Project', 'project_name'],
    parentTask: ['Parent Task', 'Parent', 'parent_task'],
    milestone: ['Milestone Name', 'Milestone', 'Task List', 'Tasklist', 'task_list', 'milestone_name'],
    tags: ['Tags', 'Labels', 'Categories'],
    workHours: ['Work hours', 'Work Hours', 'Estimated Hours', 'Hours', 'Duration', 'work_hours', 'estimated_hours'],
    percentComplete: ['% Completed', '% Complete', 'Percent Complete', 'Progress', 'percent_complete', 'completion'],
  }

  headers.forEach(header => {
    const headerLower = header.toLowerCase().trim()
    for (const [field, aliases] of Object.entries(zohoMappings)) {
      if (aliases.some(alias => alias.toLowerCase() === headerLower)) {
        columnMap.value[field] = header
        break
      }
    }
  })
}

function proceedToMapping() {
  if (!tasksFile.value) {
    error.value = 'Please upload at least a tasks CSV file'
    return
  }
  error.value = null
  step.value = 'mapping'
}

function proceedToPreview() {
  // Validate required mappings
  if (!taskColumnMap.value.title) {
    error.value = 'Please map the Task Title field'
    return
  }
  if (!taskColumnMap.value.projectName && !projectsFile.value) {
    error.value = 'Please map the Project Name field or upload a projects file'
    return
  }
  error.value = null
  step.value = 'preview'
}

// Preview data transformation
const previewTasks = computed(() => {
  return parsedTasks.value.slice(0, 10).map(row => ({
    title: row[taskColumnMap.value.title] || '',
    project: row[taskColumnMap.value.projectName] || '',
    status: mapStatus(row[taskColumnMap.value.status]),
    priority: mapPriority(row[taskColumnMap.value.priority]),
    dueDate: row[taskColumnMap.value.dueDate] || '',
    assignee: row[taskColumnMap.value.assignee] || '',
  }))
})

function mapStatus(zohoStatus: string): string {
  if (!zohoStatus) return 'todo'
  const statusLower = zohoStatus.toLowerCase().trim()

  // Exact matches first
  if (statusLower === 'closed' || statusLower === 'complete' || statusLower === 'completed' || statusLower === 'done') {
    return 'done'
  }
  if (statusLower === 'to do' || statusLower === 'todo' || statusLower === 'backlog') {
    return 'todo'
  }
  if (statusLower === 'open') {
    return 'open'
  }
  if (statusLower === 'in review' || statusLower === 'in_review') {
    return 'in_review'
  }
  if (statusLower === 'awaiting approval' || statusLower === 'awaiting_approval' || statusLower === 'pending') {
    return 'awaiting_approval'
  }

  // Fuzzy matches
  if (statusLower.includes('complete') || statusLower.includes('done') || statusLower.includes('closed')) {
    return 'done'
  }
  if (statusLower.includes('progress') || statusLower.includes('active')) {
    return 'open'
  }
  if (statusLower.includes('review')) {
    return 'in_review'
  }
  if (statusLower.includes('approval') || statusLower.includes('pending') || statusLower.includes('await')) {
    return 'awaiting_approval'
  }

  return 'todo'
}

function mapPriority(zohoPriority: string): string | null {
  if (!zohoPriority) return null
  const priorityLower = zohoPriority.toLowerCase().trim()

  // "None" means no priority set
  if (priorityLower === 'none' || priorityLower === '') {
    return null
  }
  if (priorityLower.includes('high') || priorityLower.includes('critical') || priorityLower.includes('urgent')) {
    return 'high'
  }
  if (priorityLower.includes('low')) {
    return 'low'
  }
  if (priorityLower.includes('medium') || priorityLower.includes('normal')) {
    return 'medium'
  }
  return null
}

function parseWorkHours(workHours: string): number | null {
  if (!workHours || workHours.trim() === '') return null

  // Handle HH:MM format (e.g., "05:00", "15:30")
  const colonMatch = workHours.match(/^(\d+):(\d+)$/)
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10)
    const minutes = parseInt(colonMatch[2], 10)
    return hours + (minutes / 60)
  }

  // Handle decimal format (e.g., "5.5", "10")
  const num = parseFloat(workHours)
  if (!isNaN(num)) {
    return num
  }

  return null
}

function parseTags(tagsStr: string): string[] {
  if (!tagsStr || tagsStr.trim() === '') return []

  // Handle quoted tags like: "Change request", "Design Needed"
  const tags: string[] = []
  const regex = /"([^"]+)"/g
  let match
  while ((match = regex.exec(tagsStr)) !== null) {
    tags.push(match[1].trim())
  }

  // If no quoted tags found, try comma-separated
  if (tags.length === 0) {
    return tagsStr.split(',').map(t => t.trim()).filter(t => t)
  }

  return tags
}

async function startImport() {
  if (!orgStore.currentOrganization) {
    error.value = 'Please select an organization first'
    return
  }

  importing.value = true
  error.value = null
  step.value = 'importing'

  try {
    // Transform tasks data
    const tasksToImport = parsedTasks.value.map(row => ({
      title: row[taskColumnMap.value.title] || '',
      description: row[taskColumnMap.value.description] || '',
      status: mapStatus(row[taskColumnMap.value.status]),
      priority: mapPriority(row[taskColumnMap.value.priority]),
      dueDate: row[taskColumnMap.value.dueDate] || null,
      assigneeName: row[taskColumnMap.value.assignee] || null,
      projectName: row[taskColumnMap.value.projectName] || '',
      parentTaskTitle: row[taskColumnMap.value.parentTask] || null,
      milestoneName: row[taskColumnMap.value.milestone] || null,
      tags: parseTags(row[taskColumnMap.value.tags] || ''),
      estimatedHours: parseWorkHours(row[taskColumnMap.value.workHours] || ''),
      percentComplete: parseInt(row[taskColumnMap.value.percentComplete], 10) || null,
    }))

    // Transform projects data (if provided)
    const projectsToImport = parsedProjects.value.map(row => ({
      name: row[projectColumnMap.value.name] || '',
      description: row[projectColumnMap.value.description] || '',
      status: row[projectColumnMap.value.status]?.toLowerCase().includes('archive') ? 'archived' : 'active',
    }))

    const response = await fetchApi<{
      success: boolean
      data: {
        projects: { created: number; errors: string[] }
        tasks: { created: number; errors: string[] }
      }
    }>('/api/import/zoho', {
      method: 'POST',
      body: {
        organizationId: orgStore.currentOrganization.id,
        projects: projectsToImport,
        tasks: tasksToImport,
      },
    })

    if (response.success) {
      importResults.value = response.data
      step.value = 'complete'
    } else {
      error.value = 'Import failed. Please try again.'
      step.value = 'preview'
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Import failed'
    step.value = 'preview'
  } finally {
    importing.value = false
  }
}

function resetImport() {
  step.value = 'upload'
  projectsFile.value = null
  tasksFile.value = null
  milestonesFile.value = null
  parsedProjects.value = []
  parsedTasks.value = []
  projectColumns.value = []
  taskColumns.value = []
  projectColumnMap.value = {}
  taskColumnMap.value = {}
  importResults.value = null
  error.value = null
}

useHead({
  title: 'Import from Zoho Projects',
})
</script>

<template>
  <div>
    <LayoutHeader back-link="/settings">
      <template #title>
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Import from Zoho Projects
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Import your projects and tasks from Zoho Projects CSV exports
        </p>
      </template>
    </LayoutHeader>

    <div class="p-6 max-w-4xl mx-auto">
      <!-- Progress steps -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div
            v-for="(s, idx) in ['upload', 'mapping', 'preview', 'complete']"
            :key="s"
            class="flex items-center"
          >
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
              :class="step === s || ['upload', 'mapping', 'preview', 'complete'].indexOf(step) > idx
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'"
            >
              {{ idx + 1 }}
            </div>
            <span
              class="ml-2 text-sm"
              :class="step === s ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-500 dark:text-gray-400'"
            >
              {{ s === 'upload' ? 'Upload' : s === 'mapping' ? 'Map Fields' : s === 'preview' ? 'Preview' : 'Complete' }}
            </span>
            <div v-if="idx < 3" class="w-12 h-0.5 mx-4 bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>

      <!-- Error message -->
      <div v-if="error" class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
        {{ error }}
      </div>

      <!-- Step 1: Upload -->
      <div v-if="step === 'upload'" class="space-y-6">
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Upload CSV Files
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Export your data from Zoho Projects as CSV files and upload them here. At minimum, upload a tasks file.
          </p>

          <div class="space-y-4">
            <!-- Tasks file (required) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tasks CSV <span class="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept=".csv"
                class="block w-full text-sm text-gray-500 dark:text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:border-0
                  file:text-sm file:font-medium
                  file:bg-primary-50 file:text-primary-700
                  dark:file:bg-primary-900 dark:file:text-primary-300
                  hover:file:bg-primary-100 dark:hover:file:bg-primary-800
                  file:cursor-pointer"
                @change="handleTasksFile"
              />
              <p v-if="tasksFile" class="mt-1 text-sm text-green-600 dark:text-green-400">
                {{ parsedTasks.length }} tasks found
              </p>
            </div>

            <!-- Projects file (optional) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Projects CSV <span class="text-gray-400">(optional)</span>
              </label>
              <input
                type="file"
                accept=".csv"
                class="block w-full text-sm text-gray-500 dark:text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:border-0
                  file:text-sm file:font-medium
                  file:bg-gray-100 file:text-gray-700
                  dark:file:bg-gray-700 dark:file:text-gray-300
                  hover:file:bg-gray-200 dark:hover:file:bg-gray-600
                  file:cursor-pointer"
                @change="handleProjectsFile"
              />
              <p v-if="projectsFile" class="mt-1 text-sm text-green-600 dark:text-green-400">
                {{ parsedProjects.length }} projects found
              </p>
              <p class="mt-1 text-xs text-gray-400">
                If not provided, projects will be created from task data
              </p>
            </div>
          </div>

          <div class="mt-6 flex justify-end">
            <button
              class="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!tasksFile"
              @click="proceedToMapping"
            >
              Continue to Field Mapping
            </button>
          </div>
        </div>

        <!-- Zoho export instructions -->
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-6">
          <h3 class="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
            How to export from Zoho Projects
          </h3>
          <ol class="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
            <li>Go to your Zoho Projects portal</li>
            <li>Navigate to the project you want to export</li>
            <li>Click on Tasks &gt; More Options &gt; Export to CSV</li>
            <li>For projects, go to Projects &gt; Export</li>
            <li>Upload the exported CSV files above</li>
          </ol>
        </div>
      </div>

      <!-- Step 2: Field Mapping -->
      <div v-if="step === 'mapping'" class="space-y-6">
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Map CSV Columns to Fields
          </h2>
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
                  v-model="taskColumnMap[field.key]"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
          <div v-if="projectsFile" class="mb-8">
            <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Project Fields</h3>
            <div class="grid grid-cols-2 gap-4">
              <div v-for="field in systemProjectFields" :key="field.key">
                <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  {{ field.label }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <select
                  v-model="projectColumnMap[field.key]"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
            <button
              class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              @click="step = 'upload'"
            >
              Back
            </button>
            <button
              class="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700"
              @click="proceedToPreview"
            >
              Preview Import
            </button>
          </div>
        </div>
      </div>

      <!-- Step 3: Preview -->
      <div v-if="step === 'preview'" class="space-y-6">
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Preview Import
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Review how your data will be imported. Showing first 10 tasks.
          </p>

          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Due Date</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="(task, idx) in previewTasks" :key="idx">
                  <td class="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{{ task.title }}</td>
                  <td class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{{ task.project }}</td>
                  <td class="px-4 py-2 text-sm">
                    <span class="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {{ task.status }}
                    </span>
                  </td>
                  <td class="px-4 py-2 text-sm">
                    <span
                      class="px-2 py-0.5 text-xs font-medium"
                      :class="{
                        'bg-gray-100 text-gray-600': task.priority === 'low',
                        'bg-blue-100 text-blue-600': task.priority === 'medium',
                        'bg-orange-100 text-orange-600': task.priority === 'high',
                        'bg-red-100 text-red-600': task.priority === 'urgent',
                      }"
                    >
                      {{ task.priority }}
                    </span>
                  </td>
                  <td class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{{ task.dueDate || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mt-4 p-4 bg-gray-50 dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-400">
            <strong>Summary:</strong>
            {{ parsedTasks.length }} tasks
            <span v-if="parsedProjects.length">, {{ parsedProjects.length }} projects</span>
            will be imported into <strong>{{ orgStore.currentOrganization?.name }}</strong>
          </div>

          <div class="mt-6 flex justify-between">
            <button
              class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              @click="step = 'mapping'"
            >
              Back
            </button>
            <button
              class="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
              :disabled="importing"
              @click="startImport"
            >
              {{ importing ? 'Importing...' : 'Start Import' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Step 4: Importing -->
      <div v-if="step === 'importing'" class="space-y-6">
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 text-center">
          <svg
            class="animate-spin h-12 w-12 mx-auto text-primary-600 mb-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">
            Importing your data...
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
            This may take a few moments. Please don't close this page.
          </p>
        </div>
      </div>

      <!-- Step 5: Complete -->
      <div v-if="step === 'complete'" class="space-y-6">
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
          <div class="text-center mb-6">
            <svg class="h-16 w-16 mx-auto text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">
              Import Complete!
            </h2>
          </div>

          <div v-if="importResults" class="space-y-4">
            <div class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <p class="text-green-700 dark:text-green-300">
                <strong>{{ importResults.projects.created }}</strong> projects created
              </p>
              <p class="text-green-700 dark:text-green-300">
                <strong>{{ importResults.tasks.created }}</strong> tasks created
              </p>
              <p v-if="importResults.milestones?.created" class="text-green-700 dark:text-green-300">
                <strong>{{ importResults.milestones.created }}</strong> milestones created
              </p>
              <p v-if="importResults.tags?.created" class="text-green-700 dark:text-green-300">
                <strong>{{ importResults.tags.created }}</strong> tags created
              </p>
            </div>

            <div v-if="importResults.projects.errors.length || importResults.tasks.errors.length || importResults.milestones?.errors?.length || importResults.tags?.errors?.length" class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <p class="text-yellow-700 dark:text-yellow-300 font-medium mb-2">Some items had issues:</p>
              <ul class="text-sm text-yellow-600 dark:text-yellow-400 list-disc list-inside">
                <li v-for="(err, idx) in [...importResults.projects.errors, ...importResults.tasks.errors, ...(importResults.milestones?.errors || []), ...(importResults.tags?.errors || [])].slice(0, 10)" :key="idx">
                  {{ err }}
                </li>
              </ul>
            </div>
          </div>

          <div class="mt-6 flex justify-center gap-4">
            <button
              class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              @click="resetImport"
            >
              Import More
            </button>
            <NuxtLink
              to="/projects"
              class="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700"
            >
              View Projects
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
