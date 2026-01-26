import { Project } from '../../../../models/Project'
import { SpecificationSnapshot } from '../../../../models/SpecificationSnapshot'
import { requireOrganizationMember } from '../../../../utils/tenant'

/**
 * @group Specification
 * @description Get specification snapshots for a project
 * @authenticated
 * @urlParam id string required Project ID
 * @response 200 { "success": true, "data": { "snapshots": [...] } }
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

  const snapshots = await SpecificationSnapshot.find({ project: projectId })
    .populate('milestone', 'name')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })

  return {
    success: true,
    data: {
      snapshots: snapshots.map(s => ({
        id: s._id.toString(),
        milestone: {
          id: (s.milestone as any)?._id?.toString(),
          name: (s.milestone as any)?.name || s.snapshotData.milestone.name,
        },
        version: s.version,
        snapshotData: s.snapshotData,
        createdBy: {
          id: (s.createdBy as any)?._id?.toString(),
          name: (s.createdBy as any)?.name,
          email: (s.createdBy as any)?.email,
        },
        createdAt: s.createdAt.toISOString(),
      })),
    },
  }
})
