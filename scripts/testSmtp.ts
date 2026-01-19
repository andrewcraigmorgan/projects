import net from 'net'
import crypto from 'crypto'
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/projects'
const EMAIL_TOKEN_SECRET = process.env.EMAIL_TOKEN_SECRET || 'default-secret-change-in-production'

// Generate a test token
function generateTestToken(taskId: string, email: string): string {
  const timestamp = Date.now()
  const emailHash = crypto
    .createHash('sha256')
    .update(email.toLowerCase().trim())
    .digest('hex')
    .slice(0, 16)

  const payload = `${taskId}.${emailHash}.${timestamp}`
  const signature = crypto
    .createHmac('sha256', EMAIL_TOKEN_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 16)

  return Buffer.from(`${payload}.${signature}`).toString('base64url')
}

async function sendEmail(taskId: string, fromEmail: string, fromName: string, body: string): Promise<void> {
  const token = generateTestToken(taskId, fromEmail)
  const toEmail = `reply+${token}@reply.localhost`

  console.log('Sending email to:', toEmail)

  const now = new Date().toUTCString()
  const msgId = `test-${Date.now()}@example.com`

  const emailContent = `From: ${fromName} <${fromEmail}>
To: ${toEmail}
Subject: Re: Task Update
Date: ${now}
Message-ID: <${msgId}>
Content-Type: text/plain; charset=utf-8

${body}
`

  return new Promise<void>((resolve, reject) => {
    const client = net.createConnection({ port: 2525, host: 'localhost' }, () => {
      console.log('Connected to SMTP server')
    })

    let step = 0
    const commands = [
      `EHLO localhost`,
      `MAIL FROM:<${fromEmail}>`,
      `RCPT TO:<${toEmail}>`,
      `DATA`,
      emailContent + '\r\n.',
      `QUIT`
    ]

    client.on('data', (data) => {
      const response = data.toString()
      process.stdout.write('S: ' + response)

      if (step < commands.length) {
        const cmd = commands[step]
        client.write(cmd + '\r\n')
        step++
      }
    })

    client.on('end', () => {
      resolve()
    })

    client.on('error', (err) => {
      reject(err)
    })
  })
}

async function main() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected!\n')

  // Import models
  const { Task } = await import('../server/models/Task')
  const { Comment } = await import('../server/models/Comment')

  // Find a real task
  const task = await Task.findOne().sort({ createdAt: -1 })
  if (!task) {
    console.error('No tasks found in database!')
    process.exit(1)
  }

  console.log('Using task:', task._id.toString())
  console.log('Task title:', task.title)
  console.log('')

  // Count comments before
  const commentsBefore = await Comment.countDocuments({ task: task._id })
  console.log('Comments before:', commentsBefore)

  // Send test email
  const testMessage = 'This is a test comment sent via email reply!\n\nIt was processed by the SMTP server.\n\n--\nTest Signature\nShould be stripped'

  await sendEmail(
    task._id.toString(),
    'client@example.com',
    'Test Client',
    testMessage
  )

  // Wait for processing
  console.log('\nWaiting for email to be processed...')
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Count comments after
  const commentsAfter = await Comment.countDocuments({ task: task._id })
  console.log('Comments after:', commentsAfter)

  if (commentsAfter > commentsBefore) {
    console.log('\n✓ SUCCESS: Comment was created!')

    // Show the new comment
    const newComment = await Comment.findOne({ task: task._id }).sort({ createdAt: -1 })
    if (newComment) {
      console.log('\nNew comment:')
      console.log('  Author:', newComment.authorName)
      console.log('  Email:', newComment.authorEmail)
      console.log('  Source:', newComment.source)
      console.log('  Content:', newComment.content)
    }
  } else {
    console.log('\n✗ FAILED: No comment was created')
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
