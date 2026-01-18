import { Organization } from '../../models/Organization'

/**
 * @group Organizations
 * @description List all organizations the current user belongs to
 * @authenticated
 * @response 200 { "success": true, "data": { "organizations": [...] } }
 */
export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const organizations = await Organization.find({
    'members.user': auth.userId,
  }).populate('owner', 'name email avatar')

  return {
    success: true,
    data: {
      organizations: organizations.map((org) => ({
        id: org._id,
        name: org.name,
        slug: org.slug,
        owner: org.owner,
        memberCount: org.members.length,
        myRole: org.members.find(
          (m) => m.user.toString() === auth.userId
        )?.role,
        createdAt: org.createdAt,
      })),
    },
  }
})
