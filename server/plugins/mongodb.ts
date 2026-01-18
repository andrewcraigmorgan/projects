import mongoose from 'mongoose'
import { User } from '../models/User'
import { hashPassword } from '../utils/auth'

const DEFAULT_USER = {
  email: 'admin@admin.com',
  password: 'admin123',
  name: 'Admin',
}

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()

  try {
    await mongoose.connect(config.mongodbUri)
    console.log('MongoDB connected successfully')

    // Create default user if no users exist
    const userCount = await User.countDocuments()
    if (userCount === 0) {
      const hashedPassword = await hashPassword(DEFAULT_USER.password)
      await User.create({
        email: DEFAULT_USER.email,
        password: hashedPassword,
        name: DEFAULT_USER.name,
        organizations: [],
        apiKeys: [],
      })
      console.log('Default user created: admin@admin.com / admin123')
    }
  } catch (error) {
    console.error('MongoDB connection error:', error)
    throw error
  }
})
