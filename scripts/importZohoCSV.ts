import mongoose from 'mongoose'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import { fileURLToPath } from 'url'
import { Task } from '../server/models/Task'
import { Project } from '../server/models/Project'
import { User } from '../server/models/User'
import { Organization } from '../server/models/Organization'
import { Milestone } from '../server/models/Milestone'
import { Tag } from '../server/models/Tag'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/projects'

// Command line args
const args = process.argv.slice(2)
const AUTO_CREATE_USERS = args.includes('--create-users')
const AUTO_SKIP_USERS = args.includes('--skip-users')

// Get project name from --project="Name" or --project "Name"
function getProjectNameArg(): string | null {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--project=')) {
      return arg.slice('--project='.length).replace(/^["']|["']$/g, '')
    }
    if (arg === '--project' && args[i + 1]) {
      return args[i + 1].replace(/^["']|["']$/g, '')
    }
  }
  return null
}

const PROJECT_NAME_ARG = getProjectNameArg()

// Parse CSV line handling quoted values
// preserveFirstColumn: don't trim the first column (to preserve leading spaces for subtask detection)
function parseCSVLine(line: string, preserveFirstColumn = false): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      // Don't trim the first column if preserveFirstColumn is true
      if (preserveFirstColumn && result.length === 0) {
        result.push(current)
      } else {
        result.push(current.trim())
      }
      current = ''
    } else {
      current += char
    }
  }
  // Last column gets trimmed
  result.push(current.trim())
  return result
}

// Parse work hours from HH:MM format to decimal
function parseWorkHours(workHours: string): number | null {
  if (!workHours || workHours.trim() === '') return null

  const colonMatch = workHours.match(/^(\d+):(\d+)$/)
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10)
    const minutes = parseInt(colonMatch[2], 10)
    return hours + minutes / 60
  }

  const num = parseFloat(workHours)
  if (!isNaN(num)) return num

  return null
}

// Parse tags from quoted format
function parseTags(tagsStr: string): string[] {
  if (!tagsStr || tagsStr.trim() === '') return []

  const tags: string[] = []
  const regex = /"([^"]+)"/g
  let match
  while ((match = regex.exec(tagsStr)) !== null) {
    tags.push(match[1].trim())
  }

  if (tags.length === 0) {
    return tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t)
  }

  return tags
}

// Map status
function mapStatus(zohoStatus: string): string {
  if (!zohoStatus) return 'todo'
  const statusLower = zohoStatus.toLowerCase().trim()

  if (
    statusLower === 'closed' ||
    statusLower === 'complete' ||
    statusLower === 'completed' ||
    statusLower === 'done'
  ) {
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
  if (
    statusLower === 'awaiting approval' ||
    statusLower === 'awaiting_approval' ||
    statusLower === 'pending'
  ) {
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
  if (statusLower.includes('approval') || statusLower.includes('await')) {
    return 'awaiting_approval'
  }

  return 'todo'
}

// Map priority
function mapPriority(zohoPriority: string): string | undefined {
  if (!zohoPriority) return undefined
  const priorityLower = zohoPriority.toLowerCase().trim()

  if (priorityLower === 'none' || priorityLower === '') {
    return undefined
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
  return undefined
}

interface CSVTask {
  title: string
  rawTitle: string // Original title with leading spaces
  indentLevel: number // Number of leading spaces (indicates subtask depth)
  priority: string
  owner: string
  status: string
  percentComplete: string
  tags: string
  workHours: string
  startDate: string
  dueDate: string
  milestoneName: string
  predecessors: string
  successors: string
}

// Count leading spaces in a string to determine indent level
function getIndentLevel(str: string): number {
  const match = str.match(/^(\s*)/)
  return match ? match[1].length : 0
}

// Prompt user for input
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

async function importCSV() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected!')

  // Find organization and user
  const organization = await Organization.findOne()
  if (!organization) {
    console.error('No organization found. Please create an organization first.')
    process.exit(1)
  }

  const user = await User.findOne()
  if (!user) {
    console.error('No user found. Please create a user first.')
    process.exit(1)
  }

  console.log(`\nImporting to organization: ${organization.name}`)
  console.log(`Using user: ${user.email}`)

  // Read CSV file
  const csvPath = path.join(__dirname, '..', 'task_export_1013893000023731259.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n').filter((line) => line.trim())

  if (lines.length < 2) {
    console.error('CSV file is empty or has no data rows')
    process.exit(1)
  }

  // Parse header
  const headers = parseCSVLine(lines[0])
  console.log('\nCSV Headers:', headers)

  // Column indices
  const colIdx = {
    title: headers.indexOf('Task Name'),
    priority: headers.indexOf('Priority'),
    owner: headers.indexOf('Owner'),
    status: headers.indexOf('Custom Status'),
    percentComplete: headers.indexOf('% Completed'),
    tags: headers.indexOf('Tags'),
    workHours: headers.indexOf('Work hours'),
    startDate: headers.indexOf('Start Date'),
    dueDate: headers.indexOf('Due Date'),
    milestoneName: headers.indexOf('Milestone Name'),
    predecessors: headers.indexOf('Predecessors'),
    successors: headers.indexOf('Successors'),
  }

  // Parse data rows
  const tasks: CSVTask[] = []
  for (let i = 1; i < lines.length; i++) {
    // preserveFirstColumn=true to keep leading spaces for subtask detection
    const values = parseCSVLine(lines[i], true)
    if (values.length < 2) continue

    const rawTitle = values[colIdx.title] || ''
    const indentLevel = getIndentLevel(rawTitle)

    tasks.push({
      title: rawTitle.trim(),
      rawTitle,
      indentLevel,
      priority: values[colIdx.priority] || '',
      owner: values[colIdx.owner] || '',
      status: values[colIdx.status] || '',
      percentComplete: values[colIdx.percentComplete] || '',
      tags: values[colIdx.tags] || '',
      workHours: values[colIdx.workHours] || '',
      startDate: values[colIdx.startDate] || '',
      dueDate: values[colIdx.dueDate] || '',
      milestoneName: values[colIdx.milestoneName] || '',
      predecessors: values[colIdx.predecessors] || '',
      successors: values[colIdx.successors] || '',
    })
  }

  // Count tasks with indentation (subtasks)
  const subtaskCount = tasks.filter(t => t.indentLevel > 0).length
  console.log(`  - Root tasks: ${tasks.length - subtaskCount}`)
  console.log(`  - Subtasks (indented): ${subtaskCount}`)

  console.log(`\nParsed ${tasks.length} tasks from CSV`)

  // Collect unique owner names from CSV
  const ownerNames = new Set<string>()
  for (const t of tasks) {
    if (t.owner && t.owner !== 'Unassigned User') {
      // Split multiple owners and add each
      const names = t.owner.split(',').map((n) => n.trim())
      for (const name of names) {
        if (name && name !== 'Unassigned User') {
          ownerNames.add(name)
        }
      }
    }
  }

  console.log(`\nFound ${ownerNames.size} unique user names in CSV:`)
  for (const name of ownerNames) {
    console.log(`  - ${name}`)
  }

  // Get existing users in the organization
  const existingUsers = await User.find({
    _id: { $in: organization.members.map((m: any) => m.user) },
  })

  console.log(`\nExisting users in organization:`)
  for (const u of existingUsers) {
    console.log(`  - ${u.name} (${u.email})`)
  }

  // Build user map and identify unmapped users
  const userMap = new Map<string, any>()
  const unmappedNames: string[] = []

  for (const csvName of ownerNames) {
    const csvNameLower = csvName.toLowerCase()

    // Try exact match first
    let matchedUser = existingUsers.find(
      (u) => u.name?.toLowerCase() === csvNameLower
    )

    // Try partial match if no exact match
    if (!matchedUser) {
      matchedUser = existingUsers.find(
        (u) =>
          u.name?.toLowerCase().includes(csvNameLower) ||
          csvNameLower.includes(u.name?.toLowerCase() || '')
      )
    }

    if (matchedUser) {
      userMap.set(csvName, matchedUser)
      console.log(`\nMatched: "${csvName}" -> ${matchedUser.name} (${matchedUser.email})`)
    } else {
      unmappedNames.push(csvName)
    }
  }

  // Handle unmapped users
  if (unmappedNames.length > 0) {
    console.log(`\n========================================`)
    console.log(`UNMAPPED USERS (${unmappedNames.length}):`)
    console.log(`========================================`)
    for (const name of unmappedNames) {
      console.log(`  - ${name}`)
    }

    let choice = ''
    if (AUTO_CREATE_USERS) {
      choice = '1'
      console.log('\n--create-users flag set, creating new users...')
    } else if (AUTO_SKIP_USERS) {
      choice = '2'
      console.log('\n--skip-users flag set, skipping unmapped users...')
    } else {
      console.log(`\nOptions:`)
      console.log(`  1. Create new users for unmapped names`)
      console.log(`  2. Skip assignment for unmapped users (assign to nobody)`)
      console.log(`  3. Map manually to existing users`)
      console.log(`  4. Cancel import`)

      choice = await prompt('\nEnter choice (1-4): ')
    }

    if (choice === '1') {
      // Create new users
      console.log('\nCreating new users...')
      for (const name of unmappedNames) {
        // Generate email from name
        const emailName = name.toLowerCase().replace(/\s+/g, '.')
        const email = `${emailName}@imported.local`

        // Check if email already exists
        let newUser = await User.findOne({ email })
        if (!newUser) {
          newUser = await User.create({
            name,
            email,
            password: 'imported-user-no-login', // They can't log in with this
          })
          console.log(`  Created: ${name} (${email})`)

          // Add to organization
          organization.members.push({ user: newUser._id, role: 'member' })
        } else {
          console.log(`  Already exists: ${name} (${email})`)
        }
        userMap.set(name, newUser)
      }
      await organization.save()
    } else if (choice === '2') {
      console.log('\nUnmapped users will have no assignee.')
    } else if (choice === '3') {
      // Manual mapping
      console.log('\nManual mapping mode:')
      console.log('For each unmapped name, enter the number of the existing user to map to,')
      console.log('or press Enter to skip (no assignee).\n')

      for (const name of unmappedNames) {
        console.log(`\nMapping: "${name}"`)
        for (let i = 0; i < existingUsers.length; i++) {
          console.log(`  ${i + 1}. ${existingUsers[i].name} (${existingUsers[i].email})`)
        }

        const input = await prompt('Enter number or press Enter to skip: ')
        const idx = parseInt(input, 10) - 1

        if (idx >= 0 && idx < existingUsers.length) {
          userMap.set(name, existingUsers[idx])
          console.log(`  Mapped to: ${existingUsers[idx].name}`)
        } else {
          console.log(`  Skipped`)
        }
      }
    } else {
      console.log('\nImport cancelled.')
      await mongoose.disconnect()
      process.exit(0)
    }
  }

  // Get project name from CLI arg or prompt
  let projectName = PROJECT_NAME_ARG
  if (!projectName) {
    projectName = await prompt('\nEnter project name to import into: ')
    if (!projectName || !projectName.trim()) {
      console.error('Project name is required')
      await mongoose.disconnect()
      process.exit(1)
    }
    projectName = projectName.trim()
  }

  // Create a single project for all tasks (or find existing)
  let project = await Project.findOne({
    organization: organization._id,
    name: projectName,
  })

  if (!project) {
    project = await Project.create({
      organization: organization._id,
      name: projectName,
      description: 'Imported from Zoho Projects',
      status: 'active',
      owner: user._id,
      members: [user._id],
    })
    console.log(`\nCreated project: ${project.name} (${project.code})`)
  } else {
    console.log(`\nUsing existing project: ${project.name} (${project.code})`)
  }

  // Collect unique milestone names
  const milestoneNames = new Set<string>()
  for (const t of tasks) {
    if (t.milestoneName && t.milestoneName !== 'None') {
      milestoneNames.add(t.milestoneName)
    }
  }

  // Create milestones
  const milestoneMap = new Map<string, any>()
  let milestonesCreated = 0
  for (const milestoneName of milestoneNames) {
    let milestone = await Milestone.findOne({
      project: project._id,
      name: milestoneName,
    })

    if (!milestone) {
      milestone = await Milestone.create({
        project: project._id,
        name: milestoneName,
        status: 'active',
      })
      milestonesCreated++
    }
    milestoneMap.set(milestoneName, milestone)
  }
  console.log(`Created ${milestonesCreated} milestones`)

  // Collect unique tag names
  const tagNames = new Set<string>()
  for (const t of tasks) {
    const taskTags = parseTags(t.tags)
    for (const tag of taskTags) {
      tagNames.add(tag)
    }
  }

  // Create tags
  const tagMap = new Map<string, any>()
  let tagsCreated = 0
  for (const tagName of tagNames) {
    let tag = await Tag.findOne({
      project: project._id,
      name: tagName,
    })

    if (!tag) {
      tag = await Tag.create({
        project: project._id,
        name: tagName,
      })
      tagsCreated++
    }
    tagMap.set(tagName, tag)
  }
  console.log(`Created ${tagsCreated} tags`)

  // Get highest task number for this project
  const lastTask = await Task.findOne({ project: project._id })
    .sort({ taskNumber: -1 })
    .select('taskNumber')
  let taskNumber = lastTask?.taskNumber || 0

  // Find assignee by name using our map
  function findAssignee(ownerStr: string): any | null {
    if (!ownerStr || ownerStr === 'Unassigned User') return null

    const names = ownerStr.split(',').map((n) => n.trim())
    for (const name of names) {
      const u = userMap.get(name)
      if (u) return u
    }
    return null
  }

  // Create tasks with parent-child relationship tracking
  let tasksCreated = 0
  let tasksSkipped = 0
  let subtasksLinked = 0

  console.log('\nImporting tasks...')

  // Track the most recent task at each indent level for parent linking
  // Key = indent level, Value = { csvTask, mongoTask }
  const taskStack: Map<number, { csvTask: CSVTask; mongoTask: any }> = new Map()

  // Map CSV task title to MongoDB task for linking
  const titleToTask = new Map<string, any>()

  for (const csvTask of tasks) {
    if (!csvTask.title) {
      tasksSkipped++
      continue
    }

    // Check if task already exists
    const existingTask = await Task.findOne({
      project: project._id,
      title: csvTask.title,
    })

    if (existingTask) {
      // Still add to maps for subtask linking
      taskStack.set(csvTask.indentLevel, { csvTask, mongoTask: existingTask })
      titleToTask.set(csvTask.title, existingTask)
      tasksSkipped++
      continue
    }

    // Find milestone
    let milestone = null
    if (csvTask.milestoneName && csvTask.milestoneName !== 'None') {
      milestone = milestoneMap.get(csvTask.milestoneName)
    }

    // Find tags
    const taskTags = parseTags(csvTask.tags)
    const tagIds = taskTags.map((t) => tagMap.get(t)?._id).filter(Boolean)

    // Find assignee
    const assignee = findAssignee(csvTask.owner)

    // Parse due date
    let dueDate = null
    if (csvTask.dueDate) {
      const parsed = new Date(csvTask.dueDate)
      if (!isNaN(parsed.getTime())) {
        dueDate = parsed
      }
    }

    // Find parent task if this is a subtask (indented)
    let parentTask = null
    if (csvTask.indentLevel > 0) {
      // Look for the most recent task at a lower indent level
      for (let level = csvTask.indentLevel - 1; level >= 0; level--) {
        const parent = taskStack.get(level)
        if (parent) {
          parentTask = parent.mongoTask
          break
        }
      }
    }

    taskNumber++

    const newTask = await Task.create({
      project: project._id,
      taskNumber,
      title: csvTask.title,
      description: '',
      status: mapStatus(csvTask.status),
      priority: mapPriority(csvTask.priority),
      dueDate,
      estimatedHours: parseWorkHours(csvTask.workHours) || undefined,
      assignee: assignee?._id || null,
      milestone: milestone?._id || null,
      tags: tagIds.length > 0 ? tagIds : undefined,
      parentTask: parentTask?._id || null,
      createdBy: user._id,
    })

    // Track this task for potential child tasks
    taskStack.set(csvTask.indentLevel, { csvTask, mongoTask: newTask })
    titleToTask.set(csvTask.title, newTask)

    // Clear any higher indent levels (they can't be parents anymore)
    for (const [level] of taskStack) {
      if (level > csvTask.indentLevel) {
        taskStack.delete(level)
      }
    }

    tasksCreated++
    if (parentTask) {
      subtasksLinked++
    }

    if (tasksCreated % 50 === 0) {
      console.log(`  Progress: ${tasksCreated} tasks created...`)
    }
  }

  console.log(`\n========================================`)
  console.log(`IMPORT COMPLETE!`)
  console.log(`========================================`)
  console.log(`  Tasks created: ${tasksCreated}`)
  console.log(`  Subtasks linked: ${subtasksLinked}`)
  console.log(`  Tasks skipped (duplicates): ${tasksSkipped}`)
  console.log(`  Milestones created: ${milestonesCreated}`)
  console.log(`  Tags created: ${tagsCreated}`)

  await mongoose.disconnect()
}

importCSV().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})
