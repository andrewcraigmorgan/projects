import { User } from '../../models/User'

/**
 * @group Authentication
 * @description Get current authenticated user
 * @authenticated
 * @response 200 { "success": true, "data": { "user": {...} } }
 * @response 401 { "success": false, "error": "Unauthorized" }
 */
export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const user = await User.findById(auth.userId).select('-password -apiKeys')

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'User not found',
    })
  }

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
    },
  }
})
