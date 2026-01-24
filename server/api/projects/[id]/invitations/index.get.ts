import { Project } from '../../../../models/Project'
import { Invitation } from '../../../../models/Invitation'
import { requireOrganizationMember } from '../../../../utils/tenant'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id')
  if (!projectId) {
    throw createError({ statusCode: 400, message: 'Project ID is required' })
  }

  const project = await Project.findById(projectId)
  if (!project) {
    throw createError({ statusCode: 404, message: 'Project not found' })
  }

  // Verify caller is an org member
  await requireOrganizationMember(event, project.organization.toString())

  const invitations = await Invitation.find({
    project: projectId,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  })
    .populate('invitedBy', 'name email')
    .sort({ createdAt: -1 })

  return {
    success: true,
    data: {
      invitations: invitations.map((inv) => ({
        id: inv._id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        invitedBy: inv.invitedBy,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      })),
    },
  }
})
