import mongoose from 'mongoose'
import { Task } from '../server/models/Task'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/projects'

async function test() {
  await mongoose.connect(MONGODB_URI)

  // Find a depth-2 task to test ancestors
  const subtask = await Task.findOne({ depth: 2 })
  if (!subtask) {
    console.log('No depth-2 task found')
    await mongoose.disconnect()
    return
  }

  console.log('Testing task:', subtask.title)
  console.log('Path:', subtask.path)

  // Simulate what the API does
  if (subtask.path) {
    const ancestorIds = subtask.path.split('/')
    const ancestors = await Task.find({ _id: { $in: ancestorIds } })
      .select('_id title taskNumber')

    // Sort according to path order
    const ancestorMap = new Map(ancestors.map(a => [a._id.toString(), a]))
    const orderedAncestors = ancestorIds
      .map(id => ancestorMap.get(id))
      .filter((a): a is NonNullable<typeof a> => !!a)
      .map(a => ({
        id: a._id.toString(),
        title: a.title,
        taskNumber: a.taskNumber,
      }))

    console.log('\nAncestors (in order):')
    orderedAncestors.forEach((a, i) => {
      console.log('  ' + (i + 1) + '.', a.title, '(taskNumber:', a.taskNumber + ')')
    })
  }

  await mongoose.disconnect()
}

test().catch(console.error)
