import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { Task } from '../server/models/Task'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
import { Project } from '../server/models/Project'
import { User } from '../server/models/User'
import { Organization } from '../server/models/Organization'
import { Milestone } from '../server/models/Milestone'
import { Tag } from '../server/models/Tag'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/projects'

// CSV parsing
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

function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseCSVLine(lines[0])
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })
    rows.push(row)
  }

  return { headers, rows }
}

function mapStatus(zohoStatus: string): string {
  if (!zohoStatus) return 'todo'
  const statusLower = zohoStatus.toLowerCase().trim()

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

  const colonMatch = workHours.match(/^(\d+):(\d+)$/)
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10)
    const minutes = parseInt(colonMatch[2], 10)
    return hours + (minutes / 60)
  }

  const num = parseFloat(workHours)
  if (!isNaN(num)) {
    return num
  }

  return null
}

function parseTags(tagsStr: string): string[] {
  if (!tagsStr || tagsStr.trim() === '') return []

  const tags: string[] = []
  const regex = /"([^"]+)"/g
  let match
  while ((match = regex.exec(tagsStr)) !== null) {
    tags.push(match[1].trim())
  }

  if (tags.length === 0) {
    return tagsStr.split(',').map(t => t.trim()).filter(t => t)
  }

  return tags
}

async function resetDatabase() {
  console.log('Resetting database...')

  // Delete all tasks, projects, milestones, tags (keep users and orgs)
  const deletedTasks = await Task.deleteMany({})
  console.log(`  Deleted ${deletedTasks.deletedCount} tasks`)

  const deletedMilestones = await Milestone.deleteMany({})
  console.log(`  Deleted ${deletedMilestones.deletedCount} milestones`)

  const deletedTags = await Tag.deleteMany({})
  console.log(`  Deleted ${deletedTags.deletedCount} tags`)

  const deletedProjects = await Project.deleteMany({})
  console.log(`  Deleted ${deletedProjects.deletedCount} projects`)

  console.log('Database reset complete!')
}

async function importCSV(csvPath: string, projectName: string) {
  console.log(`\nImporting CSV: ${csvPath}`)
  console.log(`Project: ${projectName}`)

  // Read CSV file
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const { headers, rows } = parseCSV(csvContent)
  console.log(`Found ${rows.length} tasks in CSV`)
  console.log(`Headers: ${headers.join(', ')}`)

  // Find first user and org
  const user = await User.findOne()
  if (!user) {
    throw new Error('No user found. Please create a user first.')
  }
  console.log(`Using user: ${user.email}`)

  const org = await Organization.findOne()
  if (!org) {
    throw new Error('No organization found. Please create an organization first.')
  }
  console.log(`Using organization: ${org.name}`)

  // Create or find project
  let project = await Project.findOne({ name: projectName, organization: org._id })
  if (!project) {
    project = await Project.create({
      organization: org._id,
      name: projectName,
      description: 'Imported from Zoho Projects',
      status: 'active',
      owner: user._id,
      members: [user._id],
    })
    console.log(`Created project: ${projectName}`)
  } else {
    console.log(`Using existing project: ${projectName}`)
  }

  // Get org members for assignee lookup
  const orgMembers = await User.find({
    _id: { $in: org.members.map((m: any) => m.user) },
  })

  const userByName = new Map<string, any>()
  for (const u of orgMembers) {
    userByName.set(u.name?.toLowerCase() || '', u)
  }

  function findAssignee(assigneeName: string | null | undefined): any | null {
    if (!assigneeName) return null
    const names = assigneeName.split(',').map(n => n.trim())
    for (const name of names) {
      const nameLower = name.toLowerCase()
      const byName = userByName.get(nameLower)
      if (byName) return byName
      for (const [key, u] of userByName.entries()) {
        if (key && (key.includes(nameLower) || nameLower.includes(key))) {
          return u
        }
      }
    }
    return null
  }

  // Column mappings for Zoho CSV
  const columnMap: Record<string, string> = {
    title: 'Task Name',
    status: 'Custom Status',
    priority: 'Priority',
    assignee: 'Owner',
    dueDate: 'Due Date',
    milestone: 'Milestone Name',
    tags: 'Tags',
    workHours: 'Work hours',
    percentComplete: '% Completed',
  }

  // Collect unique milestones
  const milestoneNames = new Set<string>()
  for (const row of rows) {
    const milestoneName = row[columnMap.milestone]
    if (milestoneName && milestoneName !== 'None') {
      milestoneNames.add(milestoneName)
    }
  }

  // Create milestones
  const milestoneMap = new Map<string, any>()
  for (const milestoneName of milestoneNames) {
    let milestone = await Milestone.findOne({ project: project._id, name: milestoneName })
    if (!milestone) {
      milestone = await Milestone.create({
        project: project._id,
        name: milestoneName,
        status: 'active',
      })
    }
    milestoneMap.set(milestoneName, milestone)
  }
  console.log(`Created/found ${milestoneMap.size} milestones`)

  // Collect unique tags
  const tagNames = new Set<string>()
  for (const row of rows) {
    const tags = parseTags(row[columnMap.tags] || '')
    tags.forEach(t => tagNames.add(t))
  }

  // Create tags
  const tagMap = new Map<string, any>()
  for (const tagName of tagNames) {
    let tag = await Tag.findOne({ project: project._id, name: tagName })
    if (!tag) {
      tag = await Tag.create({
        project: project._id,
        name: tagName,
      })
    }
    tagMap.set(tagName, tag)
  }
  console.log(`Created/found ${tagMap.size} tags`)

  // Get next task number
  const lastTask = await Task.findOne({ project: project._id })
    .sort({ taskNumber: -1 })
    .select('taskNumber')
  let nextTaskNumber = (lastTask?.taskNumber || 0) + 1

  // Create tasks
  let created = 0
  let skipped = 0
  let errors = 0

  for (const row of rows) {
    try {
      const title = row[columnMap.title]
      if (!title) {
        skipped++
        continue
      }

      // Check if task already exists
      const existing = await Task.findOne({ project: project._id, title })
      if (existing) {
        skipped++
        continue
      }

      // Find assignee
      const assignee = findAssignee(row[columnMap.assignee])

      // Parse due date
      let dueDate = null
      if (row[columnMap.dueDate]) {
        const parsed = new Date(row[columnMap.dueDate])
        if (!isNaN(parsed.getTime())) {
          dueDate = parsed
        }
      }

      // Find milestone
      const milestoneName = row[columnMap.milestone]
      const milestone = milestoneName && milestoneName !== 'None'
        ? milestoneMap.get(milestoneName)
        : null

      // Find tags
      const taskTagNames = parseTags(row[columnMap.tags] || '')
      const taskTags = taskTagNames.map(t => tagMap.get(t)?._id).filter(Boolean)

      await Task.create({
        project: project._id,
        taskNumber: nextTaskNumber++,
        title,
        description: '',
        status: mapStatus(row[columnMap.status]),
        priority: mapPriority(row[columnMap.priority]) || undefined,
        dueDate,
        estimatedHours: parseWorkHours(row[columnMap.workHours]) || undefined,
        assignee: assignee?._id || null,
        milestone: milestone?._id || null,
        tags: taskTags.length > 0 ? taskTags : undefined,
        createdBy: user._id,
      })

      created++
    } catch (e) {
      errors++
      console.error(`  Error creating task: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  console.log(`\nImport complete:`)
  console.log(`  Created: ${created}`)
  console.log(`  Skipped (duplicates): ${skipped}`)
  console.log(`  Errors: ${errors}`)
}

async function main() {
  const args = process.argv.slice(2)
  const csvPath = args[0] || path.join(__dirname, '..', 'task_export_1013893000023731259.csv')
  const projectName = args[1] || 'Zoho Import'
  const skipReset = args.includes('--no-reset')

  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected!')

  try {
    if (!skipReset) {
      await resetDatabase()
    }

    if (fs.existsSync(csvPath)) {
      await importCSV(csvPath, projectName)
    } else {
      console.log(`CSV file not found: ${csvPath}`)
      console.log('Skipping import.')
    }
  } finally {
    await mongoose.disconnect()
    console.log('\nDone!')
  }
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
