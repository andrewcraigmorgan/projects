import mongoose from 'mongoose'
import { Task } from '../server/models/Task'
import { Project } from '../server/models/Project'
import { User } from '../server/models/User'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/projects'

const statuses = ['todo', 'awaiting_approval', 'open', 'in_review', 'done'] as const
const priorities = ['low', 'medium', 'high'] as const

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
  order: number = 0
): Promise<void> {
  const task = await Task.create({
    project: projectId,
    title: template.title,
    description: `Description for: ${template.title}`,
    status: randomItem(statuses),
    priority: randomItem(priorities),
    parentTask: parentTaskId,
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
        i
      )
    }
  }
}

async function seed() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected!')

  // Find first user and first project
  const user = await User.findOne()
  if (!user) {
    console.error('No user found. Please create a user first.')
    process.exit(1)
  }

  const project = await Project.findOne()
  if (!project) {
    console.error('No project found. Please create a project first.')
    process.exit(1)
  }

  console.log(`Seeding tasks for project: ${project.name}`)
  console.log(`Using user: ${user.email}`)

  // Clear existing tasks for this project
  const deleted = await Task.deleteMany({ project: project._id })
  console.log(`Deleted ${deleted.deletedCount} existing tasks`)

  // Create all task trees
  for (let i = 0; i < taskTemplates.length; i++) {
    console.log(`Creating: ${taskTemplates[i].title}`)
    await createTaskWithSubtasks(
      taskTemplates[i],
      project._id as mongoose.Types.ObjectId,
      user._id as mongoose.Types.ObjectId,
      null,
      i
    )
  }

  const totalTasks = await Task.countDocuments({ project: project._id })
  console.log(`\nSeeding complete! Created ${totalTasks} tasks.`)

  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
})
