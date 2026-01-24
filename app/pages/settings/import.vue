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

// Step indicator
const stepLabels = ['Upload', 'Map Fields', 'Preview', 'Complete']
const stepMap = { upload: 0, mapping: 1, preview: 2, importing: 2, complete: 3 }
const currentStepIndex = computed(() => stepMap[step.value])

// File handlers
function handleProjectsFile(file: File) {
  projectsFile.value = file
  parseCSV(file, 'projects')
}

function handleTasksFile(file: File) {
  tasksFile.value = file
  parseCSV(file, 'tasks')
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
      // Auto-map common column names
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
  const columnMappings: Record<string, string[]> = {
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
    for (const [field, aliases] of Object.entries(columnMappings)) {
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

function mapStatus(sourceStatus: string): string {
  if (!sourceStatus) return 'todo'
  const statusLower = sourceStatus.toLowerCase().trim()

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

function mapPriority(sourcePriority: string): string | null {
  if (!sourcePriority) return null
  const priorityLower = sourcePriority.toLowerCase().trim()

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
  title: 'Import from CSV',
})
</script>

<template>
  <div>
    <LayoutHeader back-link="/settings">
      <template #title>
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Import from CSV
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Import your projects and tasks from CSV files
        </p>
      </template>
    </LayoutHeader>

    <div class="p-6 max-w-4xl mx-auto">
      <!-- Progress steps -->
      <UiStepIndicator
        :steps="stepLabels"
        :current-step="currentStepIndex"
        class="mb-8"
      />

      <!-- Error message -->
      <div v-if="error" class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
        {{ error }}
      </div>

      <!-- Step 1: Upload -->
      <ImportUploadStep
        v-if="step === 'upload'"
        :tasks-file="tasksFile"
        :projects-file="projectsFile"
        :parsed-tasks-count="parsedTasks.length"
        :parsed-projects-count="parsedProjects.length"
        @tasks-file="handleTasksFile"
        @projects-file="handleProjectsFile"
        @continue="proceedToMapping"
      />

      <!-- Step 2: Field Mapping -->
      <ImportMappingStep
        v-if="step === 'mapping'"
        :task-columns="taskColumns"
        :project-columns="projectColumns"
        :task-column-map="taskColumnMap"
        :project-column-map="projectColumnMap"
        :system-task-fields="systemTaskFields"
        :system-project-fields="systemProjectFields"
        :has-projects-file="!!projectsFile"
        @update:task-column-map="taskColumnMap = $event"
        @update:project-column-map="projectColumnMap = $event"
        @back="step = 'upload'"
        @continue="proceedToPreview"
      />

      <!-- Step 3: Preview -->
      <ImportPreviewStep
        v-if="step === 'preview'"
        :preview-tasks="previewTasks"
        :total-tasks="parsedTasks.length"
        :total-projects="parsedProjects.length"
        :organization-name="orgStore.currentOrganization?.name || ''"
        :importing="importing"
        @back="step = 'mapping'"
        @import="startImport"
      />

      <!-- Step 4: Importing -->
      <ImportProgressStep v-if="step === 'importing'" />

      <!-- Step 5: Complete -->
      <ImportCompleteStep
        v-if="step === 'complete'"
        :results="importResults"
        @reset="resetImport"
      />
    </div>
  </div>
</template>
