import { Project } from '../../../../models/Project'
import { SpecificationApprover } from '../../../../models/SpecificationApprover'
import { requireOrganizationMember } from '../../../../utils/tenant'

/**
 * @group Specification
 * @description List specification approvers for a project
 * @authenticated
 * @urlParam id string required Project ID
 * @response 200 { "success": true, "data": { "approvers": [...] } }
 * @response 404 { "success": false, "error": "Project not found" }
 */
export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id')
  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Project ID is required',
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

  const approvers = await SpecificationApprover.find({ project: projectId })
    .populate('user', 'name email avatar')
    .populate('addedBy', 'name email')
    .sort({ addedAt: 1 })

  return {
    success: true,
    data: {
      approvers: approvers.map(a => ({
        id: a._id.toString(),
        user: {
          id: (a.user as any)._id?.toString(),
          name: (a.user as any).name,
          email: (a.user as any).email,
          avatar: (a.user as any).avatar,
        },
        addedBy: {
          id: (a.addedBy as any)._id?.toString(),
          name: (a.addedBy as any).name,
          email: (a.addedBy as any).email,
        },
        addedAt: a.addedAt.toISOString(),
      })),
    },
  }
})
