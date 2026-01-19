import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { generateReplyToAddress } from './emailToken'

const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || 'tasks@localhost'
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'Project Tasks'
const USE_MAILPIT = process.env.USE_MAILPIT === 'true'
const MAILPIT_SMTP_PORT = parseInt(process.env.MAILPIT_SMTP_PORT || '1025', 10)

let transporter: Transporter | null = null

/**
 * Get or create the email transporter.
 * Uses Mailpit in development, sendmail in production.
 */
function getTransporter(): Transporter {
  if (transporter) {
    return transporter
  }

  if (USE_MAILPIT) {
    // Development: Use Mailpit for testing
    transporter = nodemailer.createTransport({
      host: 'localhost',
      port: MAILPIT_SMTP_PORT,
      secure: false,
    })
  } else {
    // Production: Use sendmail
    transporter = nodemailer.createTransport({
      sendmail: true,
      newline: 'unix',
      path: '/usr/sbin/sendmail',
    })
  }

  return transporter
}

export interface SendEmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
  replyTo?: string
  messageId?: string
  references?: string[]
  inReplyTo?: string
}

/**
 * Send an email.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const transport = getTransporter()

  const mailOptions = {
    from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    replyTo: options.replyTo,
    messageId: options.messageId,
    references: options.references?.join(' '),
    inReplyTo: options.inReplyTo,
  }

  await transport.sendMail(mailOptions)
}

export interface TaskNotificationData {
  taskId: string
  taskTitle: string
  taskDescription?: string
  projectName: string
  updateType: 'created' | 'updated' | 'assigned' | 'status_changed' | 'commented'
  updatedBy: {
    name: string
    email: string
  }
  changes?: {
    field: string
    oldValue?: string
    newValue?: string
  }[]
  comment?: {
    authorName: string
    content: string
  }
  taskUrl: string
}

/**
 * Send a task notification email with a reply-to token.
 */
export async function sendTaskNotification(
  recipientEmail: string,
  recipientName: string,
  data: TaskNotificationData
): Promise<void> {
  const replyTo = generateReplyToAddress(data.taskId, recipientEmail)

  const subject = getNotificationSubject(data)
  const { text, html } = getNotificationBody(data, recipientName)

  await sendEmail({
    to: `"${recipientName}" <${recipientEmail}>`,
    subject,
    text,
    html,
    replyTo,
  })
}

function getNotificationSubject(data: TaskNotificationData): string {
  switch (data.updateType) {
    case 'created':
      return `[${data.projectName}] New task: ${data.taskTitle}`
    case 'assigned':
      return `[${data.projectName}] Task assigned to you: ${data.taskTitle}`
    case 'status_changed':
      return `[${data.projectName}] Task status updated: ${data.taskTitle}`
    case 'commented':
      return `[${data.projectName}] New comment on: ${data.taskTitle}`
    default:
      return `[${data.projectName}] Task updated: ${data.taskTitle}`
  }
}

function getNotificationBody(
  data: TaskNotificationData,
  recipientName: string
): { text: string; html: string } {
  const greeting = `Hi ${recipientName},`
  let updateMessage = ''

  switch (data.updateType) {
    case 'created':
      updateMessage = `${data.updatedBy.name} created a new task.`
      break
    case 'assigned':
      updateMessage = `${data.updatedBy.name} assigned a task to you.`
      break
    case 'status_changed':
      updateMessage = `${data.updatedBy.name} updated the task status.`
      break
    case 'commented':
      updateMessage = `${data.comment?.authorName || data.updatedBy.name} commented on the task.`
      break
    default:
      updateMessage = `${data.updatedBy.name} updated the task.`
  }

  // Build changes section if applicable
  let changesSection = ''
  if (data.changes && data.changes.length > 0) {
    changesSection = '\n\nChanges:\n'
    for (const change of data.changes) {
      changesSection += `- ${change.field}: ${change.oldValue || '(none)'} → ${change.newValue || '(none)'}\n`
    }
  }

  // Build comment section if applicable
  let commentSection = ''
  if (data.comment) {
    commentSection = `\n\nComment:\n"${data.comment.content}"\n`
  }

  // Plain text version
  const text = `${greeting}

${updateMessage}

Task: ${data.taskTitle}
Project: ${data.projectName}
${data.taskDescription ? `\nDescription:\n${data.taskDescription}\n` : ''}${changesSection}${commentSection}
View task: ${data.taskUrl}

---
💬 REPLY TO THIS EMAIL to add a comment directly to this task.
Your reply will be visible to everyone following this task. No login required.
`

  // HTML version
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #0066cc; padding-bottom: 10px; margin-bottom: 20px; }
    .task-title { font-size: 18px; font-weight: bold; color: #0066cc; }
    .project-name { color: #666; font-size: 14px; }
    .section { margin: 15px 0; }
    .section-title { font-weight: bold; color: #555; margin-bottom: 5px; }
    .changes { background: #f5f5f5; padding: 10px; border-radius: 4px; }
    .change-item { margin: 5px 0; }
    .comment { background: #f0f7ff; padding: 10px; border-left: 3px solid #0066cc; border-radius: 4px; }
    .btn { display: inline-block; background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="task-title">${escapeHtml(data.taskTitle)}</div>
      <div class="project-name">${escapeHtml(data.projectName)}</div>
    </div>

    <p>${greeting}</p>
    <p>${updateMessage}</p>

    ${
      data.taskDescription
        ? `
    <div class="section">
      <div class="section-title">Description</div>
      <p>${escapeHtml(data.taskDescription)}</p>
    </div>
    `
        : ''
    }

    ${
      data.changes && data.changes.length > 0
        ? `
    <div class="section">
      <div class="section-title">Changes</div>
      <div class="changes">
        ${data.changes
          .map(
            (c) => `
          <div class="change-item">
            <strong>${escapeHtml(c.field)}:</strong>
            ${escapeHtml(c.oldValue || '(none)')} → ${escapeHtml(c.newValue || '(none)')}
          </div>
        `
          )
          .join('')}
      </div>
    </div>
    `
        : ''
    }

    ${
      data.comment
        ? `
    <div class="section">
      <div class="section-title">Comment from ${escapeHtml(data.comment.authorName)}</div>
      <div class="comment">${escapeHtml(data.comment.content)}</div>
    </div>
    `
        : ''
    }

    <div class="section">
      <a href="${escapeHtml(data.taskUrl)}" class="btn">View Task</a>
    </div>

    <div class="footer">
      <p><strong>💬 Reply to this email</strong> to add a comment directly to this task.</p>
      <p style="margin-top: 5px;">Your reply will be visible to everyone following this task. No login required.</p>
    </div>
  </div>
</body>
</html>
`

  return { text, html }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}
