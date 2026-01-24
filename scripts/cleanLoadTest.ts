/**
 * Clean up load test data
 *
 * Removes all data created by the load test seeder
 * while preserving regular application data.
 *
 * Usage: npm run clean:loadtest
 */

import mongoose from 'mongoose'
import { User } from '../server/models/User'
import { Organization } from '../server/models/Organization'
import { Project } from '../server/models/Project'
import { Task } from '../server/models/Task'
import { Comment } from '../server/models/Comment'
import { Tag } from '../server/models/Tag'
import { Milestone } from '../server/models/Milestone'
import { TaskSubscription } from '../server/models/TaskSubscription'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/projects'

async function clean(): Promise<void> {
  console.log('=== Load Test Data Cleanup ===\n')

  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected!\n')

  // Find load test organizations and projects first
  const loadTestOrgs = await Organization.find({ slug: { $regex: /^loadtest/ } })
  const loadTestProjects = await Project.find({ name: { $regex: /^Load Test/ } })

  const orgIds = loadTestOrgs.map((o) => o._id)
  const projectIds = loadTestProjects.map((p) => p._id)

  console.log(`Found ${loadTestOrgs.length} load test organizations`)
  console.log(`Found ${loadTestProjects.length} load test projects`)

  // Delete in order (respecting references)
  console.log('\nCleaning up...')

  // 1. Delete comments on load test tasks
  const tasks = await Task.find({ project: { $in: projectIds } })
  const taskIds = tasks.map((t) => t._id)
  const commentsDeleted = await Comment.deleteMany({ task: { $in: taskIds } })
  console.log(`  Deleted ${commentsDeleted.deletedCount} comments`)

  // 2. Delete task subscriptions
  const subsDeleted = await TaskSubscription.deleteMany({ task: { $in: taskIds } })
  console.log(`  Deleted ${subsDeleted.deletedCount} subscriptions`)

  // 3. Delete tasks
  const tasksDeleted = await Task.deleteMany({ project: { $in: projectIds } })
  console.log(`  Deleted ${tasksDeleted.deletedCount} tasks`)

  // 4. Delete tags and milestones
  const tagsDeleted = await Tag.deleteMany({ project: { $in: projectIds } })
  console.log(`  Deleted ${tagsDeleted.deletedCount} tags`)

  const milestonesDeleted = await Milestone.deleteMany({ project: { $in: projectIds } })
  console.log(`  Deleted ${milestonesDeleted.deletedCount} milestones`)

  // 5. Delete projects
  const projectsDeleted = await Project.deleteMany({ _id: { $in: projectIds } })
  console.log(`  Deleted ${projectsDeleted.deletedCount} projects`)

  // 6. Delete organizations
  const orgsDeleted = await Organization.deleteMany({ _id: { $in: orgIds } })
  console.log(`  Deleted ${orgsDeleted.deletedCount} organizations`)

  // 7. Delete load test users
  const usersDeleted = await User.deleteMany({ email: { $regex: /^loadtest/ } })
  console.log(`  Deleted ${usersDeleted.deletedCount} users`)

  console.log('\nCleanup complete!')
  await mongoose.disconnect()
}

clean().catch((err) => {
  console.error('Cleanup failed:', err)
  process.exit(1)
})
