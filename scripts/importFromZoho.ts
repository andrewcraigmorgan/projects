import mongoose from 'mongoose'
import * as readline from 'readline'
import { Task } from '../server/models/Task'
import { Project } from '../server/models/Project'
import { User } from '../server/models/User'
import { Organization } from '../server/models/Organization'
import { Milestone } from '../server/models/Milestone'
import { Tag } from '../server/models/Tag'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/projects'

// Command line args
const args = process.argv.slice(2)
const AUTO_CREATE_USERS = args.includes('--create-users')
const AUTO_SKIP_USERS = args.includes('--skip-users')

// Get Zoho project ID from --zoho-project="ID" or --zoho-project ID
function getZohoProjectIdArg(): string | null {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--zoho-project=')) {
      return arg.slice('--zoho-project='.length).replace(/^["']|["']$/g, '')
    }
    if (arg === '--zoho-project' && args[i + 1]) {
      return args[i + 1].replace(/^["']|["']$/g, '')
    }
  }
  return null
}

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

const ZOHO_PROJECT_ID = getZohoProjectIdArg()
const PROJECT_NAME_ARG = getProjectNameArg()

interface ZohoTask {
  id: string
  prefix: string
  name: string
  description: string
  status: {
    id: string
    name: string
    is_closed_type: boolean
  }
  priority: string
  owners_and_work?: {
    owners: Array<{
      name: string
      email: string
      zpuid: string
    }>
  }
  milestone?: {
    id: string
    name: string
  }
  tasklist?: {
    id: string
    name: string
  }
  start_date?: string
  end_date?: string
  completion_percentage: number
  subtasks?: ZohoTask[]
  parent_task_id?: string
}

interface ZohoMilestone {
  id: string
  name: string
  description?: string
  start_date?: string
  end_date?: string
  status: string
}

// Map Zoho status to our status
function mapStatus(zohoStatus: { name: string; is_closed_type: boolean }): string {
  if (zohoStatus.is_closed_type) {
    return 'done'
  }

  const statusLower = zohoStatus.name.toLowerCase()

  if (statusLower === 'to do' || statusLower === 'todo' || statusLower === 'backlog') {
    return 'todo'
  }
  if (statusLower === 'open') {
    return 'open'
  }
  if (statusLower === 'in progress' || statusLower.includes('progress')) {
    return 'in_progress'
  }
  if (statusLower === 'in review' || statusLower.includes('review')) {
    return 'in_review'
  }
  if (statusLower.includes('approval') || statusLower.includes('await')) {
    return 'awaiting_approval'
  }

  return 'todo'
}

// Map Zoho priority to our priority
function mapPriority(zohoPriority: string): string | undefined {
  if (!zohoPriority || zohoPriority === 'none') return undefined

  const priorityLower = zohoPriority.toLowerCase()

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

// Clean HTML: preserve safe tags (lists, paragraphs, etc.) but strip inline styles and dangerous elements
function cleanHtml(text: string): string {
  if (!text) return ''
  return text
    // Remove script and style tags entirely
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove all style attributes
    .replace(/\s*style\s*=\s*["'][^"']*["']/gi, '')
    // Remove color and font tags but keep content
    .replace(/<\/?font[^>]*>/gi, '')
    // Remove span tags but keep content (often used just for styling)
    .replace(/<\/?span[^>]*>/gi, '')
    // Remove class attributes
    .replace(/\s*class\s*=\s*["'][^"']*["']/gi, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    // Clean up multiple consecutive br tags
    .replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>')
    // Clean up empty paragraphs
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/<div>\s*<\/div>/gi, '')
    .trim()
}

// Strip ALL HTML tags for titles (plain text only)
function stripHtmlAndDecode(text: string): string {
  if (!text) return ''
  return text
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
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

// This script expects Zoho task data to be passed via stdin as JSON
// Usage: cat zoho_tasks.json | npx tsx scripts/importFromZoho.ts --project="Project Name"
async function importFromZoho() {
  console.log('Zoho Projects Importer')
  console.log('======================')
  console.log('')
  console.log('This script imports tasks from Zoho Projects.')
  console.log('Usage: Pass Zoho task data as JSON via stdin.')
  console.log('')

  // Read JSON from stdin
  let inputData = ''
  process.stdin.setEncoding('utf8')

  for await (const chunk of process.stdin) {
    inputData += chunk
  }

  if (!inputData.trim()) {
    console.error('No input data received. Please pipe Zoho task JSON to this script.')
    console.error('Example: cat zoho_tasks.json | npx tsx scripts/importFromZoho.ts --project="My Project"')
    process.exit(1)
  }

  let zohoData: {
    tasks: ZohoTask[]
    milestones?: ZohoMilestone[]
    project_name?: string
  }

  try {
    zohoData = JSON.parse(inputData)
  } catch (e) {
    console.error('Failed to parse JSON input:', e)
    process.exit(1)
  }

  if (!zohoData.tasks || !Array.isArray(zohoData.tasks)) {
    console.error('Invalid data format. Expected { tasks: [...] }')
    process.exit(1)
  }

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

  const tasks = zohoData.tasks
  console.log(`\nParsed ${tasks.length} tasks from Zoho data`)

  // Collect unique owner names
  const ownerNames = new Set<string>()
  for (const t of tasks) {
    if (t.owners_and_work?.owners) {
      for (const owner of t.owners_and_work.owners) {
        if (owner.name && owner.name !== 'Unassigned User') {
          ownerNames.add(owner.name)
        }
      }
    }
  }

  console.log(`\nFound ${ownerNames.size} unique user names in Zoho data:`)
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

  // Build user map
  const userMap = new Map<string, any>()
  const unmappedNames: string[] = []

  for (const ownerName of ownerNames) {
    const nameLower = ownerName.toLowerCase()

    let matchedUser = existingUsers.find(
      (u) => u.name?.toLowerCase() === nameLower
    )

    if (!matchedUser) {
      matchedUser = existingUsers.find(
        (u) =>
          u.name?.toLowerCase().includes(nameLower) ||
          nameLower.includes(u.name?.toLowerCase() || '')
      )
    }

    if (matchedUser) {
      userMap.set(ownerName, matchedUser)
      console.log(`\nMatched: "${ownerName}" -> ${matchedUser.name} (${matchedUser.email})`)
    } else {
      unmappedNames.push(ownerName)
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
      console.log(`  2. Skip assignment for unmapped users`)
      console.log(`  3. Cancel import`)

      choice = await prompt('\nEnter choice (1-3): ')
    }

    if (choice === '1') {
      for (const name of unmappedNames) {
        const emailName = name.toLowerCase().replace(/\s+/g, '.')
        const email = `${emailName}@imported.local`

        let newUser = await User.findOne({ email })
        if (!newUser) {
          newUser = await User.create({
            name,
            email,
            password: 'imported-user-no-login',
          })
          console.log(`  Created: ${name} (${email})`)
          organization.members.push({ user: newUser._id, role: 'member' })
        }
        userMap.set(name, newUser)
      }
      await organization.save()
    } else if (choice === '2') {
      console.log('\nUnmapped users will have no assignee.')
    } else {
      console.log('\nImport cancelled.')
      await mongoose.disconnect()
      process.exit(0)
    }
  }

  // Get project name
  let projectName = PROJECT_NAME_ARG || zohoData.project_name
  if (!projectName) {
    projectName = await prompt('\nEnter project name to import into: ')
    if (!projectName?.trim()) {
      console.error('Project name is required')
      await mongoose.disconnect()
      process.exit(1)
    }
  }
  projectName = projectName.trim()

  // Create or find project
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
      members: [{ user: user._id, role: 'team' }],
    })
    console.log(`\nCreated project: ${project.name} (${project.code})`)
  } else {
    console.log(`\nUsing existing project: ${project.name} (${project.code})`)
  }

  // Collect unique milestone names
  const milestoneNames = new Set<string>()
  for (const t of tasks) {
    if (t.milestone?.name) {
      milestoneNames.add(t.milestone.name)
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

  // Get highest task number
  const lastTask = await Task.findOne({ project: project._id })
    .sort({ taskNumber: -1 })
    .select('taskNumber')
  let taskNumber = lastTask?.taskNumber || 0

  // Helper to find assignee
  function findAssignee(zohoTask: ZohoTask): any | null {
    if (!zohoTask.owners_and_work?.owners) return null

    for (const owner of zohoTask.owners_and_work.owners) {
      if (owner.name && owner.name !== 'Unassigned User') {
        const u = userMap.get(owner.name)
        if (u) return u
      }
    }
    return null
  }

  // Track created tasks for parent linking
  const zohoIdToTask = new Map<string, any>()

  // First pass: Create all tasks without parent links
  let tasksCreated = 0
  let tasksSkipped = 0

  console.log('\nImporting tasks (pass 1: create tasks)...')

  for (const zohoTask of tasks) {
    if (!zohoTask.name) {
      tasksSkipped++
      continue
    }

    // Check if task already exists
    const existingTask = await Task.findOne({
      project: project._id,
      title: zohoTask.name,
    })

    if (existingTask) {
      zohoIdToTask.set(zohoTask.id, existingTask)
      tasksSkipped++
      continue
    }

    // Find milestone
    let milestone = null
    if (zohoTask.milestone?.name) {
      milestone = milestoneMap.get(zohoTask.milestone.name)
    }

    // Find assignee
    const assignee = findAssignee(zohoTask)

    // Parse dates
    let dueDate = null
    if (zohoTask.end_date) {
      const parsed = new Date(zohoTask.end_date)
      if (!isNaN(parsed.getTime())) {
        dueDate = parsed
      }
    }

    taskNumber++

    const newTask = await Task.create({
      project: project._id,
      taskNumber,
      title: stripHtmlAndDecode(zohoTask.name),
      description: cleanHtml(zohoTask.description || ''),
      status: mapStatus(zohoTask.status),
      priority: mapPriority(zohoTask.priority),
      dueDate,
      assignee: assignee?._id || null,
      milestone: milestone?._id || null,
      createdBy: user._id,
    })

    zohoIdToTask.set(zohoTask.id, newTask)
    tasksCreated++

    if (tasksCreated % 50 === 0) {
      console.log(`  Progress: ${tasksCreated} tasks created...`)
    }
  }

  // Second pass: Link parent tasks
  let subtasksLinked = 0
  console.log('\nLinking parent tasks (pass 2)...')

  for (const zohoTask of tasks) {
    if (zohoTask.parent_task_id) {
      const childTask = zohoIdToTask.get(zohoTask.id)
      const parentTask = zohoIdToTask.get(zohoTask.parent_task_id)

      if (childTask && parentTask) {
        await Task.updateOne(
          { _id: childTask._id },
          { parentTask: parentTask._id }
        )
        subtasksLinked++
      }
    }
  }

  console.log(`\n========================================`)
  console.log(`IMPORT COMPLETE!`)
  console.log(`========================================`)
  console.log(`  Tasks created: ${tasksCreated}`)
  console.log(`  Subtasks linked: ${subtasksLinked}`)
  console.log(`  Tasks skipped (duplicates): ${tasksSkipped}`)
  console.log(`  Milestones created: ${milestonesCreated}`)

  await mongoose.disconnect()
}

importFromZoho().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})
