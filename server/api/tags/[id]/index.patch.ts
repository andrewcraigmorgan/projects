import { z } from 'zod'
import { Tag } from '../../../models/Tag'
import { Project } from '../../../models/Project'
import { requireOrganizationMember } from '../../../utils/tenant'

const bodySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

/**
 * @group Tags
 * @description Update a tag
 * @authenticated
 * @param id string Tag ID
 * @body { "name": "Updated Name", "color": "#3b82f6" }
 * @response 200 { "success": true, "data": { "tag": {...} } }
 */
export default defineEventHandler(async (event) => {
  const tagId = getRouterParam(event, 'id')

  const tag = await Tag.findById(tagId)
  if (!tag) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Tag not found',
    })
  }

  // Verify project access
  const project = await Project.findById(tag.project)
  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Project not found',
    })
  }

  await requireOrganizationMember(event, project.organization.toString())

  const body = await readBody(event)
  const result = bodySchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { name, color } = result.data

  // Check for duplicate name if updating name
  if (name && name !== tag.name) {
    const existingTag = await Tag.findOne({
      project: tag.project,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: tagId },
    })

    if (existingTag) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: 'A tag with this name already exists',
      })
    }
  }

  if (name) tag.name = name
  if (color) tag.color = color

  await tag.save()

  return {
    success: true,
    data: {
      tag: {
        id: tag._id,
        name: tag.name,
        color: tag.color,
        projectId: tag.project,
        createdAt: tag.createdAt,
      },
    },
  }
})
