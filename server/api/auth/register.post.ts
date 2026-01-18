import { z } from 'zod'
import { User } from '../../models/User'
import { hashPassword, generateToken } from '../../utils/auth'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
})

/**
 * @group Authentication
 * @description Register a new user account
 * @bodyParam email string required Valid email address
 * @bodyParam password string required Password (min 8 characters)
 * @bodyParam name string required User's display name
 * @response 201 { "success": true, "data": { "user": {...}, "token": "..." } }
 * @response 400 { "success": false, "error": "Validation error" }
 * @response 409 { "success": false, "error": "Email already exists" }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = registerSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { email, password, name } = result.data

  // Check if user already exists
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: 'Email already registered',
    })
  }

  // Create user
  const hashedPassword = await hashPassword(password)
  const user = await User.create({
    email,
    password: hashedPassword,
    name,
    organizations: [],
    apiKeys: [],
  })

  // Generate token
  const token = generateToken({
    userId: user._id.toString(),
    email: user.email,
  })

  setResponseStatus(event, 201)
  return {
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      token,
    },
  }
})
