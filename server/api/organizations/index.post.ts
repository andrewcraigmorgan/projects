import { z } from 'zod'
import { Organization } from '../../models/Organization'
import { User } from '../../models/User'
import { generateSlug } from '../../utils/tenant'

const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
})

/**
 * @group Organizations
 * @description Create a new organization
 * @authenticated
 * @bodyParam name string required Organization name
 * @response 201 { "success": true, "data": { "organization": {...} } }
 * @response 400 { "success": false, "error": "Validation error" }
 * @response 409 { "success": false, "error": "Organization slug already exists" }
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
  const result = createOrgSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { name } = result.data
  let slug = generateSlug(name)

  // Ensure unique slug
  const existingOrg = await Organization.findOne({ slug })
  if (existingOrg) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  // Create organization
  const organization = await Organization.create({
    name,
    slug,
    owner: auth.userId,
    members: [
      {
        user: auth.userId,
        role: 'owner',
        joinedAt: new Date(),
      },
    ],
  })

  // Add org to user's organizations
  await User.findByIdAndUpdate(auth.userId, {
    $push: { organizations: organization._id },
  })

  setResponseStatus(event, 201)
  return {
    success: true,
    data: {
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        owner: auth.userId,
        memberCount: 1,
        myRole: 'owner',
        createdAt: organization.createdAt,
      },
    },
  }
})
