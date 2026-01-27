import { Milestone } from '../../models/Milestone'
import { Project } from '../../models/Project'
import { Task } from '../../models/Task'
import { requireOrganizationMember } from '../../utils/tenant'
import { auditContext, createAuditLog } from '../../services/audit'

/**
 * @group Milestones
 * @description Delete a milestone
 * @authenticated
 * @param id string Milestone ID
 * @response 200 { "success": true }
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
      message: 'Cannot delete a locked milestone. The milestone has been signed off.',
    })
  }

  // Create audit log before deletion
  const ctx = await auditContext(event, {
    organization: project.organization.toString(),
    project: milestone.project.toString(),
  })
  await createAuditLog(ctx, {
    action: 'delete',
    resourceType: 'milestone',
    resourceId: milestoneId,
    resourceName: milestone.name,
  })

  // Remove milestone reference from tasks
  await Task.updateMany({ milestone: milestoneId }, { $unset: { milestone: 1 } })

  // Delete milestone
  await Milestone.findByIdAndDelete(milestoneId)

  return {
    success: true,
  }
})
