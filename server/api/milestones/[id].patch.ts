import { z } from 'zod'
import { Milestone } from '../../models/Milestone'
import { Project } from '../../models/Project'
import { Task } from '../../models/Task'
import { requireOrganizationMember } from '../../utils/tenant'
import { auditContext, createAuditLog, computeChanges } from '../../services/audit'

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['pending', 'active', 'completed']).optional(),
})

/**
 * @group Milestones
 * @description Update a milestone
 * @authenticated
 * @param id string Milestone ID
 * @body { "name": "string", "description": "string", "startDate": "string", "endDate": "string", "status": "string" }
 * @response 200 { "success": true, "data": { "milestone": {...} } }
 */
export default defineEventHandler(async (event) => {
  const milestoneId = getRouterParam(event, 'id')

  if (!milestoneId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Milestone ID is required',
    })
  }

  const body = await readBody(event)
  const result = bodySchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  // Find milestone
  const milestone = await Milestone.findById(milestoneId)
  if (!milestone) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Milestone not found',
    })
  }

  // Get project and verify organization access
  const project = await Project.findById(milestone.project)
  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Project not found',
    })
  }

  await requireOrganizationMember(event, project.organization.toString())

  // Check if milestone is locked
  if (milestone.isLocked) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Cannot modify a locked milestone. The milestone has been signed off.',
    })
  }

  // Capture old state for audit logging
  const oldState = milestone.toObject()

  // Update fields
  const { name, description, startDate, endDate, status } = result.data

  if (name !== undefined) {
    milestone.name = name
  }
  if (description !== undefined) {
    milestone.description = description
  }
  if (startDate !== undefined) {
    milestone.startDate = startDate ? new Date(startDate) : undefined
  }
  if (endDate !== undefined) {
    milestone.endDate = endDate ? new Date(endDate) : undefined
  }
  if (status !== undefined) {
    milestone.status = status
  }

  await milestone.save()

  // Create audit log with changes
  const changes = computeChanges(oldState, milestone.toObject(), [
    'name',
    'description',
    'startDate',
    'endDate',
    'status',
  ])

  if (changes.length > 0) {
    const ctx = await auditContext(event, {
      organization: project.organization.toString(),
      project: milestone.project.toString(),
    })
    await createAuditLog(ctx, {
      action: 'update',
      resourceType: 'milestone',
      resourceId: milestoneId,
      resourceName: milestone.name,
      changes,
    })
  }

  // Get task stats
  const [total, completed] = await Promise.all([
    Task.countDocuments({ milestone: milestone._id }),
    Task.countDocuments({ milestone: milestone._id, status: 'done' }),
  ])

  return {
    success: true,
    data: {
      milestone: {
        id: milestone._id.toString(),
        name: milestone.name,
        description: milestone.description,
        startDate: milestone.startDate?.toISOString() || '',
        endDate: milestone.endDate?.toISOString() || '',
        status: milestone.status,
        isLocked: milestone.isLocked || false,
        lockedAt: milestone.lockedAt?.toISOString() || null,
        projectId: milestone.project.toString(),
        taskStats: { total, completed },
        createdAt: milestone.createdAt.toISOString(),
        updatedAt: milestone.updatedAt.toISOString(),
      },
    },
  }
})
