import { Tag } from '../../../models/Tag'
import { Task } from '../../../models/Task'
import { Project } from '../../../models/Project'
import { requireOrganizationMember } from '../../../utils/tenant'
import { auditContext, createAuditLog } from '../../../services/audit'

/**
 * @group Tags
 * @description Delete a tag
 * @authenticated
 * @param id string Tag ID
 * @response 200 { "success": true }
 */
export default defineEventHandler(async (event) => {
  const tagId = getRouterParam(event, 'id')

  const tag = await Tag.findById(tagId)
  if (!tag) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Tag not found',
    })
  }

  // Verify project access
  const project = await Project.findById(tag.project)
  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Project not found',
    })
  }

  await requireOrganizationMember(event, project.organization.toString())

  // Create audit log before deletion
  const ctx = await auditContext(event, {
    organization: project.organization.toString(),
    project: tag.project.toString(),
  })
  await createAuditLog(ctx, {
    action: 'delete',
    resourceType: 'tag',
    resourceId: tagId!,
    resourceName: tag.name,
  })

  // Remove tag from all tasks
  await Task.updateMany(
    { tags: tagId },
    { $pull: { tags: tagId } }
  )

  await tag.deleteOne()

  return {
    success: true,
  }
})
