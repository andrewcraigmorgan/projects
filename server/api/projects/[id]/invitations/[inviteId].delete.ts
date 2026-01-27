import { Project } from '../../../../models/Project'
import { Invitation } from '../../../../models/Invitation'
import { requireOrganizationMember } from '../../../../utils/tenant'
import { auditContext, createAuditLog } from '../../../../services/audit'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id')
  const inviteId = getRouterParam(event, 'inviteId')

  if (!projectId || !inviteId) {
    throw createError({ statusCode: 400, message: 'Project ID and Invitation ID are required' })
  }

  const project = await Project.findById(projectId)
  if (!project) {
    throw createError({ statusCode: 404, message: 'Project not found' })
  }

  // Verify caller is an org member
  await requireOrganizationMember(event, project.organization.toString())

  // Get invitation before deletion for audit log
  const invitation = await Invitation.findOne({
    _id: inviteId,
    project: projectId,
    status: 'pending',
  })

  if (!invitation) {
    throw createError({ statusCode: 404, message: 'Invitation not found' })
  }

  // Create audit log before deletion
  const ctx = await auditContext(event, {
    organization: project.organization.toString(),
    project: projectId,
  })
  await createAuditLog(ctx, {
    action: 'delete',
    resourceType: 'invitation',
    resourceId: inviteId,
    resourceName: invitation.email,
    metadata: { email: invitation.email, role: invitation.role },
  })

  await invitation.deleteOne()

  return {
    success: true,
    message: 'Invitation cancelled',
  }
})
