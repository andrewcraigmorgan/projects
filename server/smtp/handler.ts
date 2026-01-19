import type { ParsedMail } from 'mailparser'
import { extractTokenFromAddress, verifyReplyToken } from '../utils/emailToken'
import { parseEmailReply, parseEmailAddress } from '../utils/emailParser'
import { Comment } from '../models/Comment'
import { Task } from '../models/Task'
import { User } from '../models/User'
import { ensureConnection } from '../utils/db'

export interface EmailProcessingResult {
  success: boolean
  taskId?: string
  commentId?: string
  error?: string
  securityWarning?: string
}

/**
 * Process an incoming email and create a comment if valid.
 */
export async function processInboundEmail(mail: ParsedMail): Promise<EmailProcessingResult> {
  // Ensure database connection
  await ensureConnection()

  // Extract recipient address (the reply-to address)
  const toAddresses = Array.isArray(mail.to) ? mail.to : mail.to ? [mail.to] : []
  let replyToken: string | null = null

  for (const addr of toAddresses) {
    if (addr.value) {
      for (const email of addr.value) {
        const token = extractTokenFromAddress(email.address || '')
        if (token) {
          replyToken = token
          break
        }
      }
    }
    if (replyToken) break
  }

  if (!replyToken) {
    return {
      success: false,
      error: 'No valid reply token found in recipient address',
    }
  }

  // Get sender information
  const fromAddress = mail.from?.value?.[0]
  if (!fromAddress?.address) {
    return {
      success: false,
      error: 'No sender address found',
    }
  }

  const sender = parseEmailAddress(
    fromAddress.name ? `${fromAddress.name} <${fromAddress.address}>` : fromAddress.address
  )

  // Verify the token
  const verification = verifyReplyToken(replyToken, sender.email)

  if (!verification.valid) {
    console.warn(`[SMTP] Token verification failed: ${verification.error}`, {
      from: sender.email,
      messageId: mail.messageId,
    })
    return {
      success: false,
      error: verification.error,
    }
  }

  const taskId = verification.taskId!
  let securityWarning: string | undefined

  if (verification.emailMismatch) {
    securityWarning = `Email address mismatch: expected hash doesn't match sender ${sender.email}`
    console.warn(`[SMTP] Security warning: ${securityWarning}`, {
      taskId,
      from: sender.email,
      messageId: mail.messageId,
    })
  }

  // Verify task exists
  const task = await Task.findById(taskId)
  if (!task) {
    return {
      success: false,
      error: 'Task not found',
    }
  }

  // Extract reply content (strip signatures and quoted text)
  const isHtml = !!mail.html && !mail.text
  const rawContent = mail.text || (typeof mail.html === 'string' ? mail.html : '')
  const content = parseEmailReply(rawContent, isHtml)

  if (!content || content.trim().length === 0) {
    return {
      success: false,
      error: 'Empty reply content after parsing',
    }
  }

  // Try to find a user matching the sender email
  const user = await User.findOne({ email: sender.email.toLowerCase() })

  // Create the comment
  const comment = await Comment.create({
    task: taskId,
    author: user?._id || undefined,
    authorEmail: sender.email,
    authorName: sender.name || fromAddress.name || sender.email,
    content: content,
    source: 'email',
    emailMessageId: mail.messageId,
  })

  console.log(`[SMTP] Comment created from email`, {
    taskId,
    commentId: comment._id,
    from: sender.email,
    messageId: mail.messageId,
    contentLength: content.length,
  })

  return {
    success: true,
    taskId,
    commentId: comment._id.toString(),
    securityWarning,
  }
}
