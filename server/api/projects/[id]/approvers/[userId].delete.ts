import { Project } from '../../../../models/Project'
import { SpecificationApprover } from '../../../../models/SpecificationApprover'
import { requireOrganizationMember } from '../../../../utils/tenant'

/**
 * @group Specification
 * @description Remove a specification approver from a project
 * @authenticated
 * @urlParam id string required Project ID
 * @urlParam userId string required User ID to remove as approver
 * @response 200 { "success": true, "message": "Approver removed successfully" }
 * @response 404 { "success": false, "error": "Approver not found" }
 */
export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id')
  const userId = getRouterParam(event, 'userId')

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Project ID is required',
    })
  }

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'User ID is required',
    })
  }

  const project = await Project.findById(projectId)
  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Project not found',
    })
  }

  await requireOrganizationMember(event, project.organization.toString())

  const approver = await SpecificationApprover.findOneAndDelete({
    project: projectId,
    user: userId,
  })

  if (!approver) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Approver not found',
    })
  }

  return {
    success: true,
    message: 'Approver removed successfully',
  }
})
