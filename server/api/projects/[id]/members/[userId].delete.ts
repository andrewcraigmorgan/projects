import { Project } from '../../../../models/Project'
import { requireOrganizationMember } from '../../../../utils/tenant'

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

  project.members.splice(memberIndex, 1)
  await project.save()

  return {
    success: true,
    message: 'Member removed from project',
  }
})
