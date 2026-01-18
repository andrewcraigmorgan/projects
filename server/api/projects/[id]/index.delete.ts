import { Project } from '../../../models/Project'
import { Task } from '../../../models/Task'
import { requireOrganizationMember } from '../../../utils/tenant'

/**
 * @group Projects
 * @description Delete a project and all its tasks
 * @authenticated
 * @urlParam id string required Project ID
 * @response 200 { "success": true, "message": "Project deleted" }
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
  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Project not found',
    })
  }

  // Only owners and admins can delete projects
  await requireOrganizationMember(event, project.organization.toString(), [
    'owner',
    'admin',
  ])

  // Delete all tasks in the project
  await Task.deleteMany({ project: id })

  // Delete the project
  await Project.findByIdAndDelete(id)

  return {
    success: true,
    message: 'Project deleted successfully',
  }
})
