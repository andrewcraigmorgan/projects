import mongoose from 'mongoose'
import { User } from '../models/User'
import { Organization } from '../models/Organization'
import { Project } from '../models/Project'
import { Task } from '../models/Task'
import { Comment } from '../models/Comment'
import { Milestone } from '../models/Milestone'
import { Tag } from '../models/Tag'
import { hashPassword } from '../utils/auth'

// Ensure all models are registered for populate operations
void Project
void Task
void Comment
void Milestone
void Tag

const DEFAULT_USER = {
  email: 'admin@admin.com',
  password: 'admin123',
  name: 'Admin',
}

const DEFAULT_ORG = {
  name: 'Default Organization',
  slug: 'default',
}

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()

  try {
    await mongoose.connect(config.mongodbUri)
    console.log('MongoDB connected successfully')

    // Create default user and organization if no users exist
    const userCount = await User.countDocuments()
    if (userCount === 0) {
      const hashedPassword = await hashPassword(DEFAULT_USER.password)

      // Create user first
      const user = await User.create({
        email: DEFAULT_USER.email,
        password: hashedPassword,
        name: DEFAULT_USER.name,
        organizations: [],
        apiKeys: [],
      })

      // Create organization with user as owner
      const org = await Organization.create({
        name: DEFAULT_ORG.name,
        slug: DEFAULT_ORG.slug,
        owner: user._id,
        members: [
          {
            user: user._id,
            role: 'owner',
            joinedAt: new Date(),
          },
        ],
      })

      // Update user with organization reference
      await User.findByIdAndUpdate(user._id, {
        $push: { organizations: org._id },
      })

      console.log('Default user created: admin@admin.com / admin123')
      console.log('Default organization created: Default Organization')
    }
  } catch (error) {
    console.error('MongoDB connection error:', error)
    throw error
  }
})
