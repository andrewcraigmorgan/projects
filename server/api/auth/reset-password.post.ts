import { z } from 'zod'
import { User } from '../../models/User'
import { verifyResetToken, hashPassword } from '../../utils/auth'

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

/**
 * @group Authentication
 * @description Reset password using a reset token
 * @bodyParam token string required Password reset token from email
 * @bodyParam password string required New password (minimum 8 characters)
 * @response 200 { "success": true, "message": "Password has been reset" }
 * @response 400 { "success": false, "error": "Validation error" }
 * @response 400 { "success": false, "error": "Invalid or expired reset token" }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = resetPasswordSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { token, password } = result.data

  // Verify the reset token
  const payload = verifyResetToken(token)
  if (!payload) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Invalid or expired reset token',
    })
  }

  // Find the user
  const user = await User.findById(payload.userId)
  if (!user || user.email !== payload.email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Invalid or expired reset token',
    })
  }

  // Hash and update the password
  const hashedPassword = await hashPassword(password)
  await User.updateOne({ _id: user._id }, { password: hashedPassword })

  return {
    success: true,
    message: 'Password has been reset successfully',
  }
})
