import { z } from 'zod'
import { Project } from '../../models/Project'
import { requireOrganizationMember } from '../../utils/tenant'

const querySchema = z.object({
  organizationId: z.string(),
  status: z.enum(['active', 'archived', 'completed']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

/**
 * @group Projects
 * @description List projects in an organization
 * @authenticated
 * @queryParam organizationId string required Organization ID
 * @queryParam status string optional Filter by status (active, archived, completed)
 * @queryParam page number optional Page number (default: 1)
 * @queryParam limit number optional Items per page (default: 20, max: 100)
 * @response 200 { "success": true, "data": { "projects": [...], "total": 0, "page": 1, "totalPages": 0 } }
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const result = querySchema.safeParse(query)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { organizationId, status, page, limit } = result.data

  // Verify membership
  await requireOrganizationMember(event, organizationId)

  // Build query
  const filter: Record<string, unknown> = { organization: organizationId }
  if (status) {
    filter.status = status
  }

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .populate('owner', 'name email avatar')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Project.countDocuments(filter),
  ])

  return {
    success: true,
    data: {
      projects: projects.map((p) => ({
        id: p._id,
        name: p.name,
        description: p.description,
        status: p.status,
        owner: p.owner,
        memberCount: p.members.length,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  }
})
