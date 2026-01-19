import crypto from 'crypto'

const EMAIL_TOKEN_SECRET = process.env.EMAIL_TOKEN_SECRET || 'default-secret-change-in-production'
const EMAIL_TOKEN_EXPIRY_DAYS = parseInt(process.env.EMAIL_TOKEN_EXPIRY_DAYS || '30', 10)
const INBOUND_EMAIL_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN || 'reply.localhost'

export interface TokenPayload {
  taskId: string
  timestamp: number
  emailHash: string
}

/**
 * Generate a secure reply-to token for a task/email combination.
 * Token format: base64url({taskId}.{emailHash}.{timestamp}.{signature})
 */
export function generateReplyToken(taskId: string, recipientEmail: string): string {
  const timestamp = Date.now()
  const emailHash = crypto
    .createHash('sha256')
    .update(recipientEmail.toLowerCase().trim())
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

/**
 * Generate the full reply-to email address for a task notification.
 */
export function generateReplyToAddress(taskId: string, recipientEmail: string): string {
  const token = generateReplyToken(taskId, recipientEmail)
  return `reply+${token}@${INBOUND_EMAIL_DOMAIN}`
}

export interface VerifyResult {
  valid: boolean
  taskId?: string
  error?: string
  emailMismatch?: boolean
}

/**
 * Verify a reply token and extract the task ID.
 * Returns the task ID if valid, or an error message if invalid.
 */
export function verifyReplyToken(token: string, fromEmail: string): VerifyResult {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const parts = decoded.split('.')

    if (parts.length !== 4) {
      return { valid: false, error: 'Invalid token format' }
    }

    const [taskId, emailHash, timestampStr, signature] = parts
    const timestamp = parseInt(timestampStr, 10)

    if (isNaN(timestamp)) {
      return { valid: false, error: 'Invalid timestamp' }
    }

    // Verify signature
    const payload = `${taskId}.${emailHash}.${timestamp}`
    const expectedSig = crypto
      .createHmac('sha256', EMAIL_TOKEN_SECRET)
      .update(payload)
      .digest('hex')
      .slice(0, 16)

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return { valid: false, error: 'Invalid signature' }
    }

    // Check expiry
    const age = Date.now() - timestamp
    const maxAge = EMAIL_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    if (age > maxAge) {
      return { valid: false, error: 'Token expired' }
    }

    // Verify email matches (warn but allow for forwarding cases)
    const fromHash = crypto
      .createHash('sha256')
      .update(fromEmail.toLowerCase().trim())
      .digest('hex')
      .slice(0, 16)

    const emailMismatch = emailHash !== fromHash

    return {
      valid: true,
      taskId,
      emailMismatch,
    }
  } catch {
    return { valid: false, error: 'Failed to decode token' }
  }
}

/**
 * Extract token from reply-to address.
 * Handles formats like: reply+{token}@domain
 */
export function extractTokenFromAddress(address: string): string | null {
  const match = address.match(/^reply\+([^@]+)@/i)
  return match ? match[1] : null
}
