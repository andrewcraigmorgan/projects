import mongoose from 'mongoose'
import fs from 'fs'
import { Task } from '../server/models/Task'
import { Project } from '../server/models/Project'
import { User } from '../server/models/User'
import { Organization } from '../server/models/Organization'
import { Milestone } from '../server/models/Milestone'
import { MilestoneSignoff } from '../server/models/MilestoneSignoff'
import { SpecificationApprover } from '../server/models/SpecificationApprover'
import { Tag } from '../server/models/Tag'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/projects'

// Strip HTML tags and decode common HTML entities
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

// Map Zoho status to our status
function mapStatus(zohoStatus: { name: string; is_closed_type?: boolean }): string {
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
    return 'open'
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
  if (!zohoPriority || zohoPriority === 'none' || zohoPriority === 'None') return undefined

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

async function resetDatabase() {
  console.log('\nResetting database...')

  const deletedSignoffs = await MilestoneSignoff.deleteMany({})
  console.log(`  Deleted ${deletedSignoffs.deletedCount} milestone signoffs`)

  const deletedApprovers = await SpecificationApprover.deleteMany({})
  console.log(`  Deleted ${deletedApprovers.deletedCount} specification approvers`)

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

async function main() {
  const tasksFilePath = process.argv[2]
  const milestonesJson = process.argv[3]
  const projectName = process.argv[4] || 'SSSC - Workforce Data'

  if (!tasksFilePath) {
    console.error('Usage: npx tsx scripts/importFromMcpData.ts <tasks-json-file> <milestones-json> [project-name]')
    process.exit(1)
  }

  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected!')

  try {
    // Reset database
    await resetDatabase()

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

    // Read and parse tasks file
    console.log(`\nReading tasks from: ${tasksFilePath}`)
    const tasksFileContent = fs.readFileSync(tasksFilePath, 'utf-8')

    // Parse the MCP format (array with {type, text} objects)
    let rawData
    try {
      rawData = JSON.parse(tasksFileContent)
    } catch {
      console.error('Failed to parse tasks file as JSON')
      process.exit(1)
    }

    // Extract the actual data from MCP format
    let tasksData: any
    if (Array.isArray(rawData) && rawData[0]?.type === 'text') {
      tasksData = JSON.parse(rawData[0].text)
    } else {
      tasksData = rawData
    }

    const zohoTasks = tasksData.tasks || []
    console.log(`Parsed ${zohoTasks.length} tasks`)

    // Parse milestones
    let zohoMilestones: any[] = []
    if (milestonesJson) {
      try {
        const milestonesData = JSON.parse(milestonesJson)
        zohoMilestones = milestonesData.milestones || milestonesData || []
      } catch {
        console.log('Could not parse milestones JSON, continuing without milestones')
      }
    }
    console.log(`Parsed ${zohoMilestones.length} milestones`)

    // Create project
    const project = await Project.create({
      organization: organization._id,
      name: projectName,
      description: 'Imported from Zoho Projects',
      status: 'active',
      owner: user._id,
      members: [{ user: user._id, role: 'team' }],
    })
    console.log(`\nCreated project: ${project.name} (${project.code})`)

    // Create milestones
    const milestoneMap = new Map<string, any>()
    for (const zm of zohoMilestones) {
      const milestone = await Milestone.create({
        project: project._id,
        name: stripHtmlAndDecode(zm.name),
        description: stripHtmlAndDecode(zm.description || ''),
        status: zm.status?.name?.toLowerCase() === 'completed' ? 'completed' : 'active',
        startDate: zm.start_date ? new Date(zm.start_date) : undefined,
        endDate: zm.end_date ? new Date(zm.end_date) : undefined,
      })
      milestoneMap.set(zm.id.toString(), milestone)
    }
    console.log(`Created ${milestoneMap.size} milestones`)

    // Create tasks
    let taskNumber = 0
    let tasksCreated = 0
    const zohoIdToTask = new Map<string, any>()

    console.log('\nImporting tasks...')

    for (const zt of zohoTasks) {
      if (!zt.name) continue

      taskNumber++

      // Find milestone
      let milestone = null
      if (zt.milestone?.id) {
        milestone = milestoneMap.get(zt.milestone.id.toString())
      }

      // Parse due date
      let dueDate = null
      if (zt.end_date) {
        const parsed = new Date(zt.end_date)
        if (!isNaN(parsed.getTime())) {
          dueDate = parsed
        }
      }

      const task = await Task.create({
        project: project._id,
        taskNumber,
        title: stripHtmlAndDecode(zt.name),
        description: stripHtmlAndDecode(zt.description || ''),
        status: mapStatus(zt.status || { name: 'To Do' }),
        priority: mapPriority(zt.priority || ''),
        dueDate,
        milestone: milestone?._id || null,
        createdBy: user._id,
      })

      zohoIdToTask.set(zt.id.toString(), task)
      tasksCreated++

      if (tasksCreated % 50 === 0) {
        console.log(`  Progress: ${tasksCreated} tasks created...`)
      }
    }

    // Link parent tasks
    let subtasksLinked = 0
    for (const zt of zohoTasks) {
      if (zt.parent_task_id) {
        const childTask = zohoIdToTask.get(zt.id.toString())
        const parentTask = zohoIdToTask.get(zt.parent_task_id.toString())

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
    console.log(`  Milestones created: ${milestoneMap.size}`)
    console.log(`\nProject URL: http://localhost:3000/projects/${project._id}`)

  } finally {
    await mongoose.disconnect()
    console.log('\nDone!')
  }
}

main().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})
