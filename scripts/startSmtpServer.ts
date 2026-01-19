import mongoose from 'mongoose'
import { startSmtpServer, stopSmtpServer } from '../server/smtp'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/projects'

async function main() {
  console.log('Starting inbound SMTP server...')
  console.log('')

  // Connect to MongoDB first
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB!')
  console.log('')

  // Start SMTP server
  await startSmtpServer()

  console.log('')
  console.log('SMTP server is ready to receive emails.')
  console.log('Press Ctrl+C to stop.')

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...')
    await stopSmtpServer()
    await mongoose.disconnect()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('\nShutting down...')
    await stopSmtpServer()
    await mongoose.disconnect()
    process.exit(0)
  })
}

main().catch((err) => {
  console.error('Failed to start SMTP server:', err)
  process.exit(1)
})
