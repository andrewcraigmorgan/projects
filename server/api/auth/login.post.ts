import { z } from 'zod'
import { User } from '../../models/User'
import { verifyPassword, generateToken } from '../../utils/auth'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
})

/**
 * @group Authentication
 * @description Login with email and password
 * @bodyParam email string required User's email address
 * @bodyParam password string required User's password
 * @response 200 { "success": true, "data": { "user": {...}, "token": "..." } }
 * @response 400 { "success": false, "error": "Validation error" }
 * @response 401 { "success": false, "error": "Invalid credentials" }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = loginSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { email, password, rememberMe } = result.data

  // Find user
  const user = await User.findOne({ email })
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid email or password',
    })
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password)
  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid email or password',
    })
  }

  // Generate token (30 days for remember me, 7 days default)
  const token = generateToken(
    { userId: user._id.toString(), email: user.email },
    rememberMe ? '30d' : '7d'
  )

  return {
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        organizations: user.organizations,
      },
      token,
    },
  }
})
