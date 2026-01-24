/**
 * Migration script to assign unique taskNumbers to existing tasks
 * Run with: npx tsx scripts/migrateTaskNumbers.ts
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/projects'

const TaskSchema = new mongoose.Schema({
  project: mongoose.Schema.Types.ObjectId,
  taskNumber: Number,
  createdAt: Date,
})

async function migrate() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected!')

  const Task = mongoose.model('Task', TaskSchema)

  // Get all unique project IDs
  const projects = await Task.distinct('project')
  console.log(`Found ${projects.length} projects`)

  let totalUpdated = 0

  for (const projectId of projects) {
    // Get all tasks for this project that need a taskNumber, ordered by creation date
    const tasks = await Task.find({
      project: projectId,
      $or: [
        { taskNumber: 0 },
        { taskNumber: { $exists: false } },
        { taskNumber: null },
      ],
    }).sort({ createdAt: 1 })

    if (tasks.length === 0) {
      console.log(`Project ${projectId}: No tasks need updating`)
      continue
    }

    // Find the max existing taskNumber for this project
    const maxTask = await Task.findOne({ project: projectId, taskNumber: { $gt: 0 } })
      .sort({ taskNumber: -1 })
      .select('taskNumber')

    let nextNumber = (maxTask?.taskNumber || 0) + 1

    console.log(`Project ${projectId}: Updating ${tasks.length} tasks, starting from T${nextNumber}`)

    // Update each task with a unique number
    for (const task of tasks) {
      await Task.updateOne(
        { _id: task._id },
        { $set: { taskNumber: nextNumber } }
      )
      nextNumber++
      totalUpdated++
    }
  }

  console.log(`\nMigration complete! Updated ${totalUpdated} tasks`)
  await mongoose.disconnect()
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
