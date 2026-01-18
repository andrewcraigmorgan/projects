import mongoose from 'mongoose'

let isConnected = false

export default defineEventHandler(async (event) => {
  // Only connect for API routes
  const url = getRequestURL(event)
  if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/docs')) {
    return
  }

  // Connect if not already connected
  if (!isConnected && mongoose.connection.readyState !== 1) {
    try {
      const config = useRuntimeConfig()
      await mongoose.connect(config.mongodbUri)
      isConnected = true
      console.log('MongoDB connected')
    } catch (error) {
      console.error('MongoDB connection error:', error)
    }
  }
})
