import { Organization } from '../../../models/Organization'
import { requireOrganizationMember } from '../../../utils/tenant'

/**
 * @group Organizations
 * @description Get organization details
 * @authenticated
 * @urlParam id string required Organization ID
 * @response 200 { "success": true, "data": { "organization": {...} } }
 * @response 404 { "success": false, "error": "Organization not found" }
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

  const { organization, memberRole } = await requireOrganizationMember(
    event,
    id
  )

  await organization.populate('members.user', 'name email avatar')
  await organization.populate('owner', 'name email avatar')

  return {
    success: true,
    data: {
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        owner: organization.owner,
        members: organization.members.map((m) => ({
          user: m.user,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
        myRole: memberRole,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
      },
    },
  }
})
