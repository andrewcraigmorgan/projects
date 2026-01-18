import { Project } from '../../../models/Project'
import { requireOrganizationMember } from '../../../utils/tenant'

/**
 * @group Projects
 * @description Get project details
 * @authenticated
 * @urlParam id string required Project ID
 * @response 200 { "success": true, "data": { "project": {...} } }
 * @response 404 { "success": false, "error": "Project not found" }
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Project ID is required',
    })
  }

  const project = await Project.findById(id)
    .populate('owner', 'name email avatar')
    .populate('members', 'name email avatar')

  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Project not found',
    })
  }

  // Verify membership in the project's organization
  await requireOrganizationMember(event, project.organization.toString())

  return {
    success: true,
    data: {
      project: {
        id: project._id,
        organization: project.organization,
        name: project.name,
        description: project.description,
        status: project.status,
        owner: project.owner,
        members: project.members,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    },
  }
})
