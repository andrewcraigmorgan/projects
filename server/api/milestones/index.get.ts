import { z } from 'zod'
import { Milestone } from '../../models/Milestone'
import { Project } from '../../models/Project'
import { Task } from '../../models/Task'
import { requireOrganizationMember } from '../../utils/tenant'

const querySchema = z.object({
  projectId: z.string(),
})

/**
 * @group Milestones
 * @description List milestones in a project
 * @authenticated
 * @queryParam projectId string required Project ID
 * @response 200 { "success": true, "data": { "milestones": [...] } }
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

  const { projectId } = result.data

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

  // Get milestones
  const milestones = await Milestone.find({ project: projectId }).sort({ startDate: 1, name: 1 })

  // Get task stats for each milestone
  const milestonesWithStats = await Promise.all(
    milestones.map(async (m) => {
      const [total, completed] = await Promise.all([
        Task.countDocuments({ milestone: m._id }),
        Task.countDocuments({ milestone: m._id, status: 'done' }),
      ])

      return {
        id: m._id.toString(),
        name: m.name,
        description: m.description,
        startDate: m.startDate?.toISOString() || '',
        endDate: m.endDate?.toISOString() || '',
        status: m.status,
        isLocked: m.isLocked || false,
        lockedAt: m.lockedAt?.toISOString() || null,
        projectId: m.project.toString(),
        taskStats: { total, completed },
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      }
    })
  )

  return {
    success: true,
    data: {
      milestones: milestonesWithStats,
    },
  }
})
