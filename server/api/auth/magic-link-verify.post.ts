import { z } from 'zod'
import { User } from '../../models/User'
import { verifyMagicLinkToken, generateToken } from '../../utils/auth'

const verifySchema = z.object({
  token: z.string().min(1),
  rememberMe: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = verifySchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { token, rememberMe } = result.data

  const payload = verifyMagicLinkToken(token)
  if (!payload) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid or expired magic link',
    })
  }

  const user = await User.findById(payload.userId)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'User not found',
    })
  }

  // Generate auth token
  const authToken = generateToken(
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
      token: authToken,
    },
  }
})
