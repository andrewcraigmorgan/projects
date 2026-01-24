import { z } from 'zod'
import { Milestone } from '../../models/Milestone'
import { Project } from '../../models/Project'
import { requireOrganizationMember } from '../../utils/tenant'

const bodySchema = z.object({
  projectId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['pending', 'active', 'completed']).default('active'),
})

/**
 * @group Milestones
 * @description Create a new milestone
 * @authenticated
 * @body { "projectId": "string", "name": "string", "description": "string", "startDate": "string", "endDate": "string", "status": "string" }
 * @response 201 { "success": true, "data": { "milestone": {...} } }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = bodySchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { projectId, name, description, startDate, endDate, status } = result.data

  // Get project and verify organization access
  const project = await Project.findById(projectId)
  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Project not found',
    })
  }

  await requireOrganizationMember(event, project.organization.toString())

  // Create milestone
  const milestone = await Milestone.create({
    project: projectId,
    name,
    description: description || '',
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    status,
  })

  setResponseStatus(event, 201)

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
        projectId: milestone.project.toString(),
        taskStats: { total: 0, completed: 0 },
        createdAt: milestone.createdAt.toISOString(),
        updatedAt: milestone.updatedAt.toISOString(),
      },
    },
  }
})
