import { z } from 'zod'
import { AuditLog } from '../../models/AuditLog'
import { Project } from '../../models/Project'
import { requireOrganizationMember } from '../../utils/tenant'

const querySchema = z.object({
  organizationId: z.string().optional(),
  projectId: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
})

/**
 * @group Audit
 * @description Query audit logs with filters
 * @authenticated
 * @queryParam organizationId string optional Organization ID
 * @queryParam projectId string optional Project ID
 * @queryParam resourceType string optional Resource type filter
 * @queryParam resourceId string optional Resource ID filter
 * @queryParam action string optional Action filter
 * @queryParam userId string optional User ID filter
 * @queryParam startDate string optional Start date (ISO 8601)
 * @queryParam endDate string optional End date (ISO 8601)
 * @queryParam page number optional Page number (default: 1)
 * @queryParam limit number optional Items per page (default: 50, max: 100)
 * @response 200 { "success": true, "data": { "logs": [...], "total": 0, "page": 1, "limit": 50, "totalPages": 0 } }
 * @response 403 { "success": false, "error": "Requires admin or owner role" }
 */
export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const query = getQuery(event)
  const result = querySchema.safeParse(query)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const {
    organizationId,
    projectId,
    resourceType,
    resourceId,
    action,
    userId,
    startDate,
    endDate,
    page,
    limit,
  } = result.data

  // Must provide either organizationId or projectId
  if (!organizationId && !projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Either organizationId or projectId is required',
    })
  }

  // Determine organization ID and verify access
  let orgId: string
  if (projectId) {
    const project = await Project.findById(projectId)
    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Project not found',
      })
    }
    orgId = project.organization.toString()
  } else {
    orgId = organizationId!
  }

  // Require admin or owner role to view audit logs
  await requireOrganizationMember(event, orgId, ['admin', 'owner'])

  // Build filter
  const filter: Record<string, unknown> = {
    organization: orgId,
  }

  if (projectId) {
    filter.project = projectId
  }

  if (resourceType) {
    filter['resource.type'] = resourceType
  }

  if (resourceId) {
    filter['resource.id'] = resourceId
  }

  if (action) {
    // Support multiple actions separated by comma
    const actions = action.split(',').filter(Boolean)
    if (actions.length === 1) {
      filter.action = actions[0]
    } else if (actions.length > 1) {
      filter.action = { $in: actions }
    }
  }

  if (userId) {
    filter['actor.userId'] = userId
  }

  // Date range filter
  if (startDate || endDate) {
    filter.createdAt = {}
    if (startDate) {
      ;(filter.createdAt as Record<string, Date>).$gte = new Date(startDate)
    }
    if (endDate) {
      ;(filter.createdAt as Record<string, Date>).$lte = new Date(endDate)
    }
  }

  // Execute queries
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ])

  return {
    success: true,
    data: {
      logs: logs.map((log) => ({
        id: log._id,
        actor: log.actor,
        action: log.action,
        resource: log.resource,
        organization: log.organization,
        project: log.project,
        changes: log.changes,
        metadata: log.metadata,
        ip: log.ip,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  }
})
