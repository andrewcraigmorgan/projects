import { z } from 'zod'
import { User } from '../../models/User'
import { generateResetToken } from '../../utils/auth'
import { sendEmail } from '../../utils/email'

const APP_URL = process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

/**
 * @group Authentication
 * @description Request a password reset email
 * @bodyParam email string required User's email address
 * @response 200 { "success": true, "message": "If an account exists, you will receive an email" }
 * @response 400 { "success": false, "error": "Validation error" }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = forgotPasswordSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { email } = result.data

  // Find user but don't reveal if they exist
  const user = await User.findOne({ email })

  if (user) {
    const token = generateResetToken(user._id.toString(), user.email)
    const resetUrl = `${APP_URL}/reset-password?token=${token}`

    await sendEmail({
      to: user.email,
      subject: 'Reset your password',
      text: `Hi ${user.name},

You requested to reset your password. Click the link below to set a new password:

${resetUrl}

This link will expire in 15 minutes.

If you didn't request this, you can safely ignore this email.
`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #0066cc; padding-bottom: 10px; margin-bottom: 20px; }
    .btn { display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0; color: #333;">Reset Your Password</h2>
    </div>

    <p>Hi ${user.name},</p>
    <p>You requested to reset your password. Click the button below to set a new password:</p>

    <a href="${resetUrl}" class="btn">Reset Password</a>

    <p style="color: #666; font-size: 14px;">This link will expire in 15 minutes.</p>

    <div class="footer">
      <p>If you didn't request this, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
`,
    })
  }

  // Always return success to prevent email enumeration
  return {
    success: true,
    message: 'If an account exists with that email, you will receive a password reset link',
  }
})
