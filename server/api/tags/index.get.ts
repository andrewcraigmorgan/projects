import { z } from 'zod'
import { Tag } from '../../models/Tag'
import { Project } from '../../models/Project'
import { requireOrganizationMember } from '../../utils/tenant'

const querySchema = z.object({
  projectId: z.string(),
})

/**
 * @group Tags
 * @description List tags for a project
 * @authenticated
 * @queryParam projectId string required Project ID
 * @response 200 { "success": true, "data": { "tags": [...] } }
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const result = querySchema.safeParse(query)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { projectId } = result.data

  // Verify project access
  const project = await Project.findById(projectId)
  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Project not found',
    })
  }

  await requireOrganizationMember(event, project.organization.toString())

  const tags = await Tag.find({ project: projectId }).sort({ name: 1 })

  return {
    success: true,
    data: {
      tags: tags.map((t) => ({
        id: t._id,
        name: t.name,
        color: t.color,
        projectId: t.project,
        createdAt: t.createdAt,
      })),
    },
  }
})
