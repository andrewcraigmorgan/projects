import { z } from 'zod'
import { Tag } from '../../models/Tag'
import { Project } from '../../models/Project'
import { requireOrganizationMember } from '../../utils/tenant'
import { auditContext, createAuditLog } from '../../services/audit'

const bodySchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

/**
 * @group Tags
 * @description Create a new tag
 * @authenticated
 * @body { "projectId": "...", "name": "Bug", "color": "#ef4444" }
 * @response 201 { "success": true, "data": { "tag": {...} } }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = bodySchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { projectId, name, color } = result.data

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

  // Check for duplicate name
  const existingTag = await Tag.findOne({
    project: projectId,
    name: { $regex: new RegExp(`^${name}$`, 'i') },
  })

  if (existingTag) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: 'A tag with this name already exists',
    })
  }

  // Default colors if not provided
  const defaultColors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  ]
  const tagColor = color || defaultColors[Math.floor(Math.random() * defaultColors.length)]

  const tag = await Tag.create({
    project: projectId,
    name,
    color: tagColor,
  })

  // Create audit log
  const ctx = await auditContext(event, {
    organization: project.organization.toString(),
    project: projectId,
  })
  await createAuditLog(ctx, {
    action: 'create',
    resourceType: 'tag',
    resourceId: tag._id.toString(),
    resourceName: tag.name,
  })

  setResponseStatus(event, 201)
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
