import { verifyToken } from '../utils/auth'
import { User } from '../models/User'
import type { AuthPayload } from '~/types'

declare module 'h3' {
  interface H3EventContext {
    auth?: AuthPayload
    user?: InstanceType<typeof User>
  }
}

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)

  // Skip auth for public routes
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/docs',
    '/docs',
  ]

  if (publicPaths.some((path) => url.pathname.startsWith(path))) {
    return
  }

  // Skip auth for non-API routes
  if (!url.pathname.startsWith('/api/')) {
    return
  }

  // Check for API key first
  const apiKey = getHeader(event, 'x-api-key')
  if (apiKey) {
    const user = await User.findOne({ 'apiKeys.key': apiKey })
    if (user) {
      // Update last used timestamp
      await User.updateOne(
        { _id: user._id, 'apiKeys.key': apiKey },
        { $set: { 'apiKeys.$.lastUsedAt': new Date() } }
      )
      event.context.auth = {
        userId: user._id.toString(),
        email: user.email,
      }
      event.context.user = user
      return
    }
  }

  // Check for JWT token
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Missing or invalid authorization header',
    })
  }

  const token = authHeader.slice(7)
  const payload = verifyToken(token)

  if (!payload) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid or expired token',
    })
  }

  event.context.auth = payload
})
