import { Project } from '../../../../models/Project'
import { requireOrganizationMember } from '../../../../utils/tenant'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id')
  if (!projectId) {
    throw createError({ statusCode: 400, message: 'Project ID is required' })
  }

  const project = await Project.findById(projectId)
    .populate('members.user', 'name email avatar')
    .populate('owner', 'name email avatar')

  if (!project) {
    throw createError({ statusCode: 404, message: 'Project not found' })
  }

  // Verify caller is an org member
  await requireOrganizationMember(event, project.organization.toString())

  return {
    success: true,
    data: {
      owner: project.owner,
      members: project.members
        .filter((m: any) => m.user != null)
        .map((m: any) => ({
          user: m.user,
          role: m.role,
          addedAt: m.addedAt,
        })),
    },
  }
})
