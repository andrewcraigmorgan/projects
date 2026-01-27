import { Project } from '../../../../models/Project'
import { User } from '../../../../models/User'
import { requireOrganizationMember } from '../../../../utils/tenant'
import { auditContext, createAuditLog } from '../../../../services/audit'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id')
  const userId = getRouterParam(event, 'userId')

  if (!projectId || !userId) {
    throw createError({ statusCode: 400, message: 'Project ID and User ID are required' })
  }

  const project = await Project.findById(projectId)
  if (!project) {
    throw createError({ statusCode: 404, message: 'Project not found' })
  }

  // Verify caller is an org member
  await requireOrganizationMember(event, project.organization.toString())

  // Can't remove the project owner
  if (project.owner.toString() === userId) {
    throw createError({ statusCode: 400, message: 'Cannot remove the project owner' })
  }

  // Find and remove the member
  const memberIndex = project.members.findIndex(
    (m: any) => {
      const mUserId = m.user?._id?.toString?.() || m.user?.toString?.()
      return mUserId === userId
    }
  )

  if (memberIndex === -1) {
    throw createError({ statusCode: 404, message: 'Member not found in project' })
  }

  // Create audit log before removal
  const targetUser = await User.findById(userId).select('name email')
  const ctx = await auditContext(event, {
    organization: project.organization.toString(),
    project: projectId,
  })
  await createAuditLog(ctx, {
    action: 'remove_member',
    resourceType: 'member',
    resourceId: userId,
    resourceName: targetUser?.name || targetUser?.email || userId,
  })

  project.members.splice(memberIndex, 1)
  await project.save()

  return {
    success: true,
    message: 'Member removed from project',
  }
})
