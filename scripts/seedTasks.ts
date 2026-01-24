import mongoose from 'mongoose'
import { Task } from '../server/models/Task'
import { Project } from '../server/models/Project'
import { User } from '../server/models/User'
import { Organization } from '../server/models/Organization'
import { Milestone } from '../server/models/Milestone'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/projects'

const DEFAULT_PROJECT = {
  name: 'Demo Project',
  description: 'A demo project with sample tasks for testing and demonstration purposes.',
}

const statuses = ['todo', 'awaiting_approval', 'open', 'in_review', 'done'] as const
const priorities = ['low', 'medium', 'high'] as const

// Milestone templates - each epic task will be assigned to a milestone
const milestoneTemplates = [
  {
    name: 'Phase 1: Foundation',
    description: 'Core infrastructure and authentication setup',
    status: 'active' as const,
  },
  {
    name: 'Phase 2: Core Features',
    description: 'Main feature development and implementation',
    status: 'pending' as const,
  },
  {
    name: 'Phase 3: Polish & Launch',
    description: 'Testing, documentation, and release preparation',
    status: 'pending' as const,
  },
]

// Map epic tasks to milestones (by index)
const taskToMilestoneMap: Record<string, number> = {
  'User Authentication System': 0, // Phase 1
  'API Performance Optimization': 0, // Phase 1
  'Dashboard Redesign': 1, // Phase 2
  'Mobile App Development': 1, // Phase 2
  'Documentation Overhaul': 2, // Phase 3
}

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const taskTemplates = [
  // Epic-level tasks
  { title: 'User Authentication System', subtasks: [
    { title: 'Design login flow', subtasks: [
      { title: 'Create wireframes' },
      { title: 'Review with stakeholders' },
      { title: 'Finalize design specs' },
    ]},
    { title: 'Implement backend auth', subtasks: [
      { title: 'Set up JWT tokens' },
      { title: 'Create user model' },
      { title: 'Add password hashing' },
    ]},
    { title: 'Build frontend components', subtasks: [
      { title: 'Login form component' },
      { title: 'Registration form' },
      { title: 'Password reset flow' },
    ]},
  ]},
  { title: 'Dashboard Redesign', subtasks: [
    { title: 'Research user needs', subtasks: [
      { title: 'Conduct user interviews' },
      { title: 'Analyze usage data' },
      { title: 'Create user personas' },
    ]},
    { title: 'Create new layouts', subtasks: [
      { title: 'Mobile layout' },
      { title: 'Desktop layout' },
      { title: 'Tablet layout' },
    ]},
    { title: 'Implement changes', subtasks: [
      { title: 'Update CSS framework' },
      { title: 'Refactor grid system' },
      { title: 'Add responsive breakpoints' },
    ]},
  ]},
  { title: 'API Performance Optimization', subtasks: [
    { title: 'Identify bottlenecks', subtasks: [
      { title: 'Profile database queries' },
      { title: 'Analyze API response times' },
      { title: 'Review caching strategy' },
    ]},
    { title: 'Implement caching', subtasks: [
      { title: 'Set up Redis' },
      { title: 'Cache frequent queries' },
      { title: 'Add cache invalidation' },
    ]},
    { title: 'Database optimization', subtasks: [
      { title: 'Add missing indexes' },
      { title: 'Optimize slow queries' },
      { title: 'Consider data sharding' },
    ]},
  ]},
  { title: 'Mobile App Development', subtasks: [
    { title: 'Set up project', subtasks: [
      { title: 'Initialize React Native' },
      { title: 'Configure build tools' },
      { title: 'Set up CI/CD pipeline' },
    ]},
    { title: 'Core features', subtasks: [
      { title: 'Navigation system' },
      { title: 'State management' },
      { title: 'API integration' },
    ]},
    { title: 'Testing & QA', subtasks: [
      { title: 'Unit tests' },
      { title: 'Integration tests' },
      { title: 'Beta testing program' },
    ]},
  ]},
  { title: 'Documentation Overhaul', subtasks: [
    { title: 'Audit existing docs', subtasks: [
      { title: 'List all pages' },
      { title: 'Identify outdated content' },
      { title: 'Note missing topics' },
    ]},
    { title: 'Write new content', subtasks: [
      { title: 'API reference' },
      { title: 'Getting started guide' },
      { title: 'Tutorials section' },
    ]},
    { title: 'Set up doc site', subtasks: [
      { title: 'Choose documentation tool' },
      { title: 'Configure search' },
      { title: 'Deploy to production' },
    ]},
  ]},
]

interface TaskTemplate {
  title: string
  subtasks?: TaskTemplate[]
}

async function createTaskWithSubtasks(
  template: TaskTemplate,
  projectId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  parentTaskId: mongoose.Types.ObjectId | null = null,
  order: number = 0,
  milestoneId: mongoose.Types.ObjectId | null = null
): Promise<void> {
  const task = await Task.create({
    project: projectId,
    title: template.title,
    description: `Description for: ${template.title}`,
    status: randomItem(statuses),
    priority: randomItem(priorities),
    parentTask: parentTaskId,
    milestone: milestoneId,
    order,
    createdBy: userId,
  })

  if (template.subtasks) {
    for (let i = 0; i < template.subtasks.length; i++) {
      await createTaskWithSubtasks(
        template.subtasks[i],
        projectId,
        userId,
        task._id as mongoose.Types.ObjectId,
        i,
        milestoneId // Subtasks inherit parent's milestone
      )
    }
  }
}

async function seed() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected!')

  // Find first user (should be created by mongodb plugin on startup)
  const user = await User.findOne()
  if (!user) {
    console.error('No user found. Please start the app first to create the default user.')
    process.exit(1)
  }

  // Find the user's organization
  let org = await Organization.findOne({ members: { $elemMatch: { user: user._id } } })
  if (!org) {
    console.error('No organization found. Please start the app first to create the default organization.')
    process.exit(1)
  }

  // Find or create the demo project
  let project = await Project.findOne({ name: DEFAULT_PROJECT.name, organization: org._id })
  if (!project) {
    console.log('Creating demo project...')
    project = await Project.create({
      name: DEFAULT_PROJECT.name,
      description: DEFAULT_PROJECT.description,
      organization: org._id,
      owner: user._id,
      members: [user._id],
      status: 'active',
    })
    console.log(`Created project: ${project.name}`)
  }

  console.log(`Seeding tasks for project: ${project.name}`)
  console.log(`Using user: ${user.email}`)

  // Clear existing tasks and milestones for this project
  const deletedTasks = await Task.deleteMany({ project: project._id })
  console.log(`Deleted ${deletedTasks.deletedCount} existing tasks`)

  const deletedMilestones = await Milestone.deleteMany({ project: project._id })
  console.log(`Deleted ${deletedMilestones.deletedCount} existing milestones`)

  // Create milestones
  console.log('\nCreating milestones...')
  const milestones: mongoose.Types.ObjectId[] = []
  const today = new Date()

  for (let i = 0; i < milestoneTemplates.length; i++) {
    const template = milestoneTemplates[i]
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() + i * 30) // Each phase is 30 days apart
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 30) // Each phase lasts 30 days

    const milestone = await Milestone.create({
      project: project._id,
      name: template.name,
      description: template.description,
      status: template.status,
      startDate,
      endDate,
    })
    milestones.push(milestone._id as mongoose.Types.ObjectId)
    console.log(`  Created: ${template.name}`)
  }

  // Create all task trees with milestone assignments
  console.log('\nCreating tasks...')
  for (let i = 0; i < taskTemplates.length; i++) {
    const taskTitle = taskTemplates[i].title
    const milestoneIndex = taskToMilestoneMap[taskTitle]
    const milestoneId = milestoneIndex !== undefined ? milestones[milestoneIndex] : null

    console.log(`Creating: ${taskTitle}${milestoneId ? ` (${milestoneTemplates[milestoneIndex].name})` : ''}`)
    await createTaskWithSubtasks(
      taskTemplates[i],
      project._id as mongoose.Types.ObjectId,
      user._id as mongoose.Types.ObjectId,
      null,
      i,
      milestoneId
    )
  }

  const totalTasks = await Task.countDocuments({ project: project._id })
  const totalMilestones = await Milestone.countDocuments({ project: project._id })
  console.log(`\nSeeding complete! Created ${totalMilestones} milestones and ${totalTasks} tasks.`)

  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
})
