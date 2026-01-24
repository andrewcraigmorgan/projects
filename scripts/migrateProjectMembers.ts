/**
 * Migration script to convert Project.members from ObjectId[] to embedded documents
 * with role, addedAt fields.
 *
 * Run with: npx tsx scripts/migrateProjectMembers.ts
 *
 * This is safe to run multiple times - it only updates projects that still
 * have the old format (plain ObjectId references).
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/projects'

async function migrate() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected!')

  const db = mongoose.connection.db!

  const projects = await db.collection('projects').find({}).toArray()
  console.log(`Found ${projects.length} projects`)

  let updatedCount = 0

  for (const project of projects) {
    if (!project.members || project.members.length === 0) {
      continue
    }

    // Check if already migrated (first member is an object with 'user' key)
    const firstMember = project.members[0]
    if (firstMember && typeof firstMember === 'object' && firstMember.user) {
      console.log(`Project "${project.name}" (${project._id}): Already migrated, skipping`)
      continue
    }

    // Convert ObjectId[] to embedded documents
    const newMembers = project.members.map((userId: any) => ({
      user: userId,
      role: 'team',
      addedAt: project.createdAt || new Date(),
    }))

    await db.collection('projects').updateOne(
      { _id: project._id },
      { $set: { members: newMembers } }
    )

    console.log(`Project "${project.name}" (${project._id}): Migrated ${newMembers.length} members`)
    updatedCount++
  }

  console.log(`\nMigration complete! Updated ${updatedCount} projects`)
  await mongoose.disconnect()
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
