import { SMTPServer } from 'smtp-server'
import { simpleParser } from 'mailparser'
import { processInboundEmail } from './handler'

const INBOUND_SMTP_PORT = parseInt(process.env.INBOUND_SMTP_PORT || '2525', 10)
const INBOUND_SMTP_HOST = process.env.INBOUND_SMTP_HOST || '0.0.0.0'

let server: SMTPServer | null = null

/**
 * Create and configure the inbound SMTP server.
 */
export function createSmtpServer(): SMTPServer {
  server = new SMTPServer({
    // Disable authentication (we validate via reply tokens)
    authOptional: true,
    disabledCommands: ['AUTH'],

    // Allow connections without STARTTLS for local development
    secure: false,
    disableReverseLookup: true,

    // Size limit: 10MB
    size: 10 * 1024 * 1024,

    // Handle incoming messages
    onData(stream, session, callback) {
      const chunks: Buffer[] = []

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      stream.on('end', async () => {
        try {
          const rawEmail = Buffer.concat(chunks)

          // Parse the email
          const parsed = await simpleParser(rawEmail)

          console.log(`[SMTP] Received email from ${session.envelope.mailFrom}`, {
            subject: parsed.subject,
            to: session.envelope.rcptTo.map((r) => r.address),
            messageId: parsed.messageId,
          })

          // Process the email
          const result = await processInboundEmail(parsed)

          if (result.success) {
            console.log(`[SMTP] Successfully processed email`, {
              taskId: result.taskId,
              commentId: result.commentId,
            })
            callback()
          } else {
            console.warn(`[SMTP] Failed to process email: ${result.error}`)
            // Still accept the email to prevent retry storms
            // The error is logged for debugging
            callback()
          }
        } catch (error) {
          console.error('[SMTP] Error processing email:', error)
          // Accept anyway to prevent retry storms
          callback()
        }
      })

      stream.on('error', (err) => {
        console.error('[SMTP] Stream error:', err)
        callback(new Error('Stream error'))
      })
    },

    // Log connections
    onConnect(session, callback) {
      console.log(`[SMTP] Connection from ${session.remoteAddress}`)
      callback()
    },

    // Log mail from
    onMailFrom(address, session, callback) {
      console.log(`[SMTP] MAIL FROM: ${address.address}`)
      callback()
    },

    // Log rcpt to
    onRcptTo(address, session, callback) {
      console.log(`[SMTP] RCPT TO: ${address.address}`)
      callback()
    },
  })

  return server
}

/**
 * Start the SMTP server.
 */
export function startSmtpServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!server) {
      server = createSmtpServer()
    }

    server.listen(INBOUND_SMTP_PORT, INBOUND_SMTP_HOST, () => {
      console.log(`[SMTP] Inbound SMTP server listening on ${INBOUND_SMTP_HOST}:${INBOUND_SMTP_PORT}`)
      resolve()
    })

    server.on('error', (err) => {
      console.error('[SMTP] Server error:', err)
      reject(err)
    })
  })
}

/**
 * Stop the SMTP server.
 */
export function stopSmtpServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('[SMTP] Server stopped')
        server = null
        resolve()
      })
    } else {
      resolve()
    }
  })
}
