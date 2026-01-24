import { Project } from '../../../../models/Project'
import { Invitation } from '../../../../models/Invitation'
import { requireOrganizationMember } from '../../../../utils/tenant'

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

  const invitation = await Invitation.findOneAndDelete({
    _id: inviteId,
    project: projectId,
    status: 'pending',
  })

  if (!invitation) {
    throw createError({ statusCode: 404, message: 'Invitation not found' })
  }

  return {
    success: true,
    message: 'Invitation cancelled',
  }
})
