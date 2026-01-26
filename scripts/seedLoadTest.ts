/**
 * Load Test Data Seeder
 *
 * Creates a large dataset for load testing:
 * - 100 users
 * - 10 organizations
 * - 50 projects (5 per org)
 * - 10,000+ tasks with hierarchical structure
 * - 5,000+ comments
 * - Tags and milestones
 *
 * Usage: npm run seed:loadtest
 * Or with custom config: USERS=200 PROJECTS=100 npm run seed:loadtest
 */

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { User } from '../server/models/User'
import { Organization } from '../server/models/Organization'
import { Project } from '../server/models/Project'
import { Task } from '../server/models/Task'
import { Comment } from '../server/models/Comment'
import { Tag } from '../server/models/Tag'
import { Milestone } from '../server/models/Milestone'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/projects'

// Configuration (can be overridden via env vars)
const CONFIG = {
  users: parseInt(process.env.USERS || '100'),
  organizations: parseInt(process.env.ORGANIZATIONS || '10'),
  projectsPerOrg: parseInt(process.env.PROJECTS_PER_ORG || '5'),
  tasksPerProject: parseInt(process.env.TASKS_PER_PROJECT || '200'),
  maxTaskDepth: parseInt(process.env.MAX_TASK_DEPTH || '3'),
  commentsPerTask: parseInt(process.env.COMMENTS_PER_TASK || '3'),
  tagsPerProject: parseInt(process.env.TAGS_PER_PROJECT || '10'),
  milestonesPerProject: parseInt(process.env.MILESTONES_PER_PROJECT || '5'),
}

const PASSWORD_HASH = bcrypt.hashSync('loadtest123', 10)

// Data generators
const statuses = ['todo', 'awaiting_approval', 'open', 'in_review', 'done'] as const
const priorities = ['low', 'medium', 'high'] as const
const milestoneStatuses = ['pending', 'active', 'completed'] as const

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

// Task title templates for realistic data
const taskVerbs = ['Implement', 'Fix', 'Update', 'Refactor', 'Add', 'Remove', 'Optimize', 'Test', 'Review', 'Document']
const taskNouns = ['authentication', 'dashboard', 'API endpoint', 'database schema', 'UI component', 'caching layer', 'error handling', 'logging', 'notifications', 'search functionality']
const taskModifiers = ['for mobile', 'for admin users', 'in production', 'with tests', 'for performance', 'with validation', 'with error states', 'for accessibility']

function generateTaskTitle(): string {
  const verb = randomItem(taskVerbs)
  const noun = randomItem(taskNouns)
  const modifier = Math.random() > 0.5 ? ` ${randomItem(taskModifiers)}` : ''
  return `${verb} ${noun}${modifier}`
}

const commentTemplates = [
  'This looks good to me.',
  'Can we add more tests for this?',
  'I think we should consider a different approach here.',
  'Great work on this implementation!',
  'This needs a review from the team lead.',
  'I found an edge case that needs handling.',
  'The performance could be improved here.',
  'Let\'s discuss this in the next standup.',
  'This is blocked by the API changes.',
  'Ready for QA testing.',
  'Updated based on feedback.',
  'This should fix the reported issue.',
]

function generateComment(): string {
  return randomItem(commentTemplates)
}

const tagNames = ['bug', 'feature', 'enhancement', 'documentation', 'testing', 'performance', 'security', 'ui', 'backend', 'frontend', 'urgent', 'blocked', 'needs-review', 'wip', 'ready']

interface CreatedData {
  users: mongoose.Types.ObjectId[]
  organizations: mongoose.Types.ObjectId[]
  projects: mongoose.Types.ObjectId[]
  tasks: mongoose.Types.ObjectId[]
  tags: Map<string, mongoose.Types.ObjectId[]>
  milestones: Map<string, mongoose.Types.ObjectId[]>
}

async function createUsers(count: number): Promise<mongoose.Types.ObjectId[]> {
  console.log(`Creating ${count} users...`)

  // Create admin user
  const adminUser = await User.findOneAndUpdate(
    { email: 'loadtest-admin@example.com' },
    {
      email: 'loadtest-admin@example.com',
      password: PASSWORD_HASH,
      name: 'Load Test Admin',
      organizations: [],
    },
    { upsert: true, new: true }
  )

  const userIds: mongoose.Types.ObjectId[] = [adminUser._id as mongoose.Types.ObjectId]

  // Batch create regular users
  const batchSize = 50
  for (let batch = 0; batch < Math.ceil(count / batchSize); batch++) {
    const users = []
    const start = batch * batchSize + 1
    const end = Math.min(start + batchSize, count + 1)

    for (let i = start; i < end; i++) {
      users.push({
        email: `loadtest-user-${i}@example.com`,
        password: PASSWORD_HASH,
        name: `Load Test User ${i}`,
        organizations: [],
      })
    }

    // Use bulkWrite with upsert for idempotency
    const ops = users.map((u) => ({
      updateOne: {
        filter: { email: u.email },
        update: { $setOnInsert: u },
        upsert: true,
      },
    }))

    await User.bulkWrite(ops)

    const createdUsers = await User.find({
      email: { $in: users.map((u) => u.email) },
    })
    userIds.push(...createdUsers.map((u) => u._id as mongoose.Types.ObjectId))

    process.stdout.write(`\r  Users: ${userIds.length}/${count + 1}`)
  }

  console.log(`\n  Created ${userIds.length} users`)
  return userIds
}

async function createOrganizations(
  count: number,
  userIds: mongoose.Types.ObjectId[]
): Promise<mongoose.Types.ObjectId[]> {
  console.log(`Creating ${count} organizations...`)

  const orgIds: mongoose.Types.ObjectId[] = []
  const usersPerOrg = Math.floor(userIds.length / count)

  for (let i = 0; i < count; i++) {
    const ownerId = userIds[i % userIds.length]
    const memberIds = userIds.slice(i * usersPerOrg, (i + 1) * usersPerOrg)

    const org = await Organization.findOneAndUpdate(
      { slug: `loadtest-org-${i + 1}` },
      {
        name: `Load Test Organization ${i + 1}`,
        slug: `loadtest-org-${i + 1}`,
        owner: ownerId,
        members: memberIds.map((id) => ({
          user: id,
          role: id.equals(ownerId) ? 'owner' : 'member',
          joinedAt: new Date(),
        })),
      },
      { upsert: true, new: true }
    )

    orgIds.push(org._id as mongoose.Types.ObjectId)

    // Update users with org reference
    await User.updateMany(
      { _id: { $in: memberIds } },
      { $addToSet: { organizations: org._id } }
    )

    process.stdout.write(`\r  Organizations: ${i + 1}/${count}`)
  }

  console.log(`\n  Created ${orgIds.length} organizations`)
  return orgIds
}

async function createProjects(
  orgs: mongoose.Types.ObjectId[],
  projectsPerOrg: number,
  userIds: mongoose.Types.ObjectId[]
): Promise<mongoose.Types.ObjectId[]> {
  const totalProjects = orgs.length * projectsPerOrg
  console.log(`Creating ${totalProjects} projects...`)

  const projectIds: mongoose.Types.ObjectId[] = []
  let projectNum = 0

  for (const orgId of orgs) {
    const orgMembers = await User.find({ organizations: orgId })
    const memberIds = orgMembers.map((u) => u._id as mongoose.Types.ObjectId)

    for (let i = 0; i < projectsPerOrg; i++) {
      projectNum++
      const ownerId = memberIds[i % memberIds.length]
      const projectName = `Load Test Project ${projectNum}`
      const projectCode = `LT${projectNum}`

      // Check if project exists first
      let project = await Project.findOne({ organization: orgId, name: projectName })

      if (!project) {
        // Create new project (triggers pre-save hook for code generation)
        project = await Project.create({
          organization: orgId,
          name: projectName,
          code: projectCode,
          description: `Project ${projectNum} for load testing purposes`,
          status: 'active',
          owner: ownerId,
          members: memberIds.slice(0, Math.min(10, memberIds.length)).map((id) => ({
            user: id,
            role: 'team' as const,
          })),
        })
      }

      projectIds.push(project._id as mongoose.Types.ObjectId)
      process.stdout.write(`\r  Projects: ${projectNum}/${totalProjects}`)
    }
  }

  console.log(`\n  Created ${projectIds.length} projects`)
  return projectIds
}

async function createTagsAndMilestones(
  projectIds: mongoose.Types.ObjectId[]
): Promise<{ tags: Map<string, mongoose.Types.ObjectId[]>; milestones: Map<string, mongoose.Types.ObjectId[]> }> {
  console.log('Creating tags and milestones...')

  const tagsMap = new Map<string, mongoose.Types.ObjectId[]>()
  const milestonesMap = new Map<string, mongoose.Types.ObjectId[]>()

  let count = 0
  for (const projectId of projectIds) {
    const projectKey = projectId.toString()

    // Create tags
    const tagOps = tagNames.slice(0, CONFIG.tagsPerProject).map((name) => ({
      updateOne: {
        filter: { project: projectId, name },
        update: { $setOnInsert: { project: projectId, name } },
        upsert: true,
      },
    }))
    await Tag.bulkWrite(tagOps)
    const tags = await Tag.find({ project: projectId })
    tagsMap.set(projectKey, tags.map((t) => t._id as mongoose.Types.ObjectId))

    // Create milestones
    const now = new Date()
    const milestoneOps = Array.from({ length: CONFIG.milestonesPerProject }, (_, i) => {
      const startDate = new Date(now.getTime() + i * 30 * 24 * 60 * 60 * 1000)
      const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      return {
        updateOne: {
          filter: { project: projectId, name: `Sprint ${i + 1}` },
          update: {
            $setOnInsert: {
              project: projectId,
              name: `Sprint ${i + 1}`,
              description: `Sprint ${i + 1} milestone`,
              startDate,
              endDate,
              status: randomItem(milestoneStatuses),
            },
          },
          upsert: true,
        },
      }
    })
    await Milestone.bulkWrite(milestoneOps)
    const milestones = await Milestone.find({ project: projectId })
    milestonesMap.set(projectKey, milestones.map((m) => m._id as mongoose.Types.ObjectId))

    count++
    process.stdout.write(`\r  Tags/Milestones: ${count}/${projectIds.length} projects`)
  }

  console.log('\n  Created tags and milestones')
  return { tags: tagsMap, milestones: milestonesMap }
}

async function createTasks(
  projectIds: mongoose.Types.ObjectId[],
  userIds: mongoose.Types.ObjectId[],
  tagsMap: Map<string, mongoose.Types.ObjectId[]>,
  milestonesMap: Map<string, mongoose.Types.ObjectId[]>
): Promise<mongoose.Types.ObjectId[]> {
  const totalTasks = projectIds.length * CONFIG.tasksPerProject
  console.log(`Creating ${totalTasks} tasks...`)

  const taskIds: mongoose.Types.ObjectId[] = []
  let taskCount = 0

  const now = new Date()
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const threeMonthsAhead = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  for (const projectId of projectIds) {
    const projectKey = projectId.toString()
    const projectTags = tagsMap.get(projectKey) || []
    const projectMilestones = milestonesMap.get(projectKey) || []

    // Clear existing tasks for this project (for clean re-runs)
    await Task.deleteMany({ project: projectId, title: { $regex: /^(Implement|Fix|Update|Refactor|Add|Remove|Optimize|Test|Review|Document)/ } })

    // Get the highest existing task number for this project
    const lastTask = await Task.findOne({ project: projectId })
      .sort({ taskNumber: -1 })
      .select('taskNumber')
    let nextTaskNumber = (lastTask?.taskNumber || 0) + 1

    const projectTaskIds: mongoose.Types.ObjectId[] = []
    const batchSize = 100

    for (let batch = 0; batch < Math.ceil(CONFIG.tasksPerProject / batchSize); batch++) {
      const tasks = []
      const start = batch * batchSize
      const end = Math.min(start + batchSize, CONFIG.tasksPerProject)

      for (let i = start; i < end; i++) {
        const createdBy = randomItem(userIds)
        const assignee = Math.random() > 0.3 ? randomItem(userIds) : undefined
        const dueDate = Math.random() > 0.4 ? randomDate(threeMonthsAgo, threeMonthsAhead) : undefined
        const milestone = Math.random() > 0.5 && projectMilestones.length > 0 ? randomItem(projectMilestones) : undefined
        const taskTags = projectTags.length > 0
          ? projectTags.filter(() => Math.random() > 0.7).slice(0, 3)
          : []

        // Determine parent task (for hierarchy)
        let parentTask = null
        let depth = 0
        if (i > 0 && Math.random() > 0.6 && projectTaskIds.length > 0) {
          // Find a potential parent that's not too deep
          const potentialParents = projectTaskIds.filter((_, idx) => idx < i)
          if (potentialParents.length > 0) {
            const parentIdx = randomInt(Math.max(0, potentialParents.length - 20), potentialParents.length - 1)
            const parentId = potentialParents[parentIdx]
            const parent = await Task.findById(parentId).select('depth')
            if (parent && parent.depth < CONFIG.maxTaskDepth) {
              parentTask = parentId
              depth = parent.depth + 1
            }
          }
        }

        tasks.push({
          project: projectId,
          taskNumber: nextTaskNumber++,
          title: generateTaskTitle(),
          description: `Load test task ${taskCount + i + 1}. This is a sample task description for testing purposes.`,
          status: randomItem(statuses),
          priority: randomItem(priorities),
          assignee,
          dueDate,
          milestone,
          tags: taskTags,
          parentTask,
          depth,
          order: i,
          createdBy,
          estimatedHours: Math.random() > 0.5 ? randomInt(1, 40) : undefined,
        })
      }

      const insertedTasks = await Task.insertMany(tasks)
      const newIds = insertedTasks.map((t) => t._id as mongoose.Types.ObjectId)
      projectTaskIds.push(...newIds)
      taskIds.push(...newIds)
      taskCount += tasks.length

      process.stdout.write(`\r  Tasks: ${taskCount}/${totalTasks}`)
    }
  }

  console.log(`\n  Created ${taskIds.length} tasks`)
  return taskIds
}

async function createComments(
  taskIds: mongoose.Types.ObjectId[],
  userIds: mongoose.Types.ObjectId[]
): Promise<void> {
  // Only add comments to a subset of tasks
  const tasksWithComments = taskIds.filter(() => Math.random() > 0.5)
  const totalComments = tasksWithComments.length * CONFIG.commentsPerTask
  console.log(`Creating ~${totalComments} comments...`)

  let commentCount = 0
  const batchSize = 500

  const allComments = []
  for (const taskId of tasksWithComments) {
    const numComments = randomInt(1, CONFIG.commentsPerTask)
    for (let i = 0; i < numComments; i++) {
      allComments.push({
        task: taskId,
        author: randomItem(userIds),
        content: generateComment(),
        source: 'app',
      })
    }
  }

  // Batch insert comments
  for (let i = 0; i < allComments.length; i += batchSize) {
    const batch = allComments.slice(i, i + batchSize)
    await Comment.insertMany(batch)
    commentCount += batch.length
    process.stdout.write(`\r  Comments: ${commentCount}/${allComments.length}`)
  }

  console.log(`\n  Created ${commentCount} comments`)
}

async function printStats(): Promise<void> {
  console.log('\n--- Database Statistics ---')
  const [users, orgs, projects, tasks, comments, tags, milestones] = await Promise.all([
    User.countDocuments({ email: { $regex: /^loadtest/ } }),
    Organization.countDocuments({ slug: { $regex: /^loadtest/ } }),
    Project.countDocuments({ name: { $regex: /^Load Test/ } }),
    Task.countDocuments(),
    Comment.countDocuments(),
    Tag.countDocuments(),
    Milestone.countDocuments(),
  ])

  console.log(`  Users (loadtest): ${users}`)
  console.log(`  Organizations: ${orgs}`)
  console.log(`  Projects: ${projects}`)
  console.log(`  Tasks: ${tasks}`)
  console.log(`  Comments: ${comments}`)
  console.log(`  Tags: ${tags}`)
  console.log(`  Milestones: ${milestones}`)
}

async function seed(): Promise<void> {
  console.log('=== Load Test Data Seeder ===\n')
  console.log('Configuration:')
  console.log(`  Users: ${CONFIG.users}`)
  console.log(`  Organizations: ${CONFIG.organizations}`)
  console.log(`  Projects per org: ${CONFIG.projectsPerOrg}`)
  console.log(`  Tasks per project: ${CONFIG.tasksPerProject}`)
  console.log(`  Max task depth: ${CONFIG.maxTaskDepth}`)
  console.log(`  Comments per task: ${CONFIG.commentsPerTask}`)
  console.log('')

  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected!\n')

  const startTime = Date.now()

  // Create all data
  const userIds = await createUsers(CONFIG.users)
  const orgIds = await createOrganizations(CONFIG.organizations, userIds)
  const projectIds = await createProjects(orgIds, CONFIG.projectsPerOrg, userIds)
  const { tags, milestones } = await createTagsAndMilestones(projectIds)
  const taskIds = await createTasks(projectIds, userIds, tags, milestones)
  await createComments(taskIds, userIds)

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\nSeeding completed in ${duration}s`)

  await printStats()
  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('\nSeeding failed:', err)
  process.exit(1)
})
