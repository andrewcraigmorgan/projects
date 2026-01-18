import { z } from 'zod'
import { Organization } from '../../../models/Organization'
import { User } from '../../../models/User'
import { requireOrganizationMember } from '../../../utils/tenant'

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).default('member'),
})

/**
 * @group Organizations
 * @description Add a member to the organization
 * @authenticated
 * @urlParam id string required Organization ID
 * @bodyParam email string required Email of user to add
 * @bodyParam role string optional Role (admin or member, default: member)
 * @response 200 { "success": true, "data": { "member": {...} } }
 * @response 404 { "success": false, "error": "User not found" }
 * @response 409 { "success": false, "error": "User is already a member" }
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Organization ID is required',
    })
  }

  // Only owners and admins can add members
  await requireOrganizationMember(event, id, ['owner', 'admin'])

  const body = await readBody(event)
  const result = addMemberSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { email, role } = result.data

  // Find user by email
  const user = await User.findOne({ email })
  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'User with this email not found',
    })
  }

  // Check if already a member
  const org = await Organization.findById(id)
  if (org?.members.some((m) => m.user.toString() === user._id.toString())) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: 'User is already a member of this organization',
    })
  }

  // Add member
  await Organization.findByIdAndUpdate(id, {
    $push: {
      members: {
        user: user._id,
        role,
        joinedAt: new Date(),
      },
    },
  })

  // Add org to user's organizations
  await User.findByIdAndUpdate(user._id, {
    $addToSet: { organizations: id },
  })

  return {
    success: true,
    data: {
      member: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
        role,
        joinedAt: new Date(),
      },
    },
  }
})
