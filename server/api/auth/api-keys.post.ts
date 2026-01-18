import { z } from 'zod'
import { User } from '../../models/User'
import { generateApiKey } from '../../utils/auth'

const createApiKeySchema = z.object({
  name: z.string().min(1).max(50),
})

/**
 * @group Authentication
 * @description Create a new API key for the authenticated user
 * @authenticated
 * @bodyParam name string required A name to identify this API key
 * @response 201 { "success": true, "data": { "apiKey": { "key": "pk_...", "name": "..." } } }
 * @response 400 { "success": false, "error": "Validation error" }
 */
export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const body = await readBody(event)
  const result = createApiKeySchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { name } = result.data
  const key = generateApiKey()

  await User.findByIdAndUpdate(auth.userId, {
    $push: {
      apiKeys: {
        key,
        name,
        createdAt: new Date(),
      },
    },
  })

  setResponseStatus(event, 201)
  return {
    success: true,
    data: {
      apiKey: {
        key,
        name,
        createdAt: new Date(),
      },
    },
    message:
      'Save this key securely - it will not be shown again in full',
  }
})
