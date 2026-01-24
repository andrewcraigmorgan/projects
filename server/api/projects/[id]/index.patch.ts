import { z } from 'zod'
import { Project } from '../../../models/Project'
import { requireOrganizationMember } from '../../../utils/tenant'

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['active', 'archived', 'completed']).optional(),
})

/**
 * @group Projects
 * @description Update a project
 * @authenticated
 * @urlParam id string required Project ID
 * @bodyParam name string optional Project name
 * @bodyParam description string optional Project description
 * @bodyParam status string optional Project status (active, archived, completed)
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

  const body = await readBody(event)
  const result = updateProjectSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
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

  // Verify membership in the project's organization
  await requireOrganizationMember(event, project.organization.toString())

  // Update project
  const updatedProject = await Project.findByIdAndUpdate(
    id,
    { $set: result.data },
    { new: true }
  )
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')

  return {
    success: true,
    data: {
      project: {
        id: updatedProject!._id,
        organization: updatedProject!.organization,
        name: updatedProject!.name,
        code: updatedProject!.code,
        description: updatedProject!.description,
        status: updatedProject!.status,
        owner: updatedProject!.owner,
        members: updatedProject!.members.map((m: any) => ({
          _id: m.user?._id || m.user,
          name: m.user?.name,
          email: m.user?.email,
          avatar: m.user?.avatar,
          role: m.role,
        })),
        createdAt: updatedProject!.createdAt,
        updatedAt: updatedProject!.updatedAt,
      },
    },
  }
})
