import { z } from 'zod'
import { User } from '../../models/User'
import { generateMagicLinkToken } from '../../utils/auth'
import { sendMagicLinkEmail } from '../../utils/email'

const APP_URL = process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'

const magicLinkSchema = z.object({
  email: z.string().email(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = magicLinkSchema.safeParse(body)
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
    const token = generateMagicLinkToken(user._id.toString(), user.email)
    const loginUrl = `${APP_URL}/magic-link/verify?token=${token}`

    await sendMagicLinkEmail(user.email, user.name, { loginUrl })
  }

  // Always return success to prevent email enumeration
  return {
    success: true,
    message: 'If an account exists with that email, you will receive a sign-in link',
  }
})
