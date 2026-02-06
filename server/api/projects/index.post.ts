import { z } from 'zod'
import { Project } from '../../models/Project'
import { Tag } from '../../models/Tag'
import { requireOrganizationMember } from '../../utils/tenant'
import { auditContext, createAuditLog } from '../../services/audit'

const DEFAULT_TAGS = [
  { name: 'Frontend', color: '#3B82F6' },
  { name: 'Developer', color: '#8B5CF6' },
  { name: 'Design', color: '#EC4899' },
  { name: 'Client', color: '#F59E0B' },
]

const createProjectSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
})

/**
 * @group Projects
 * @description Create a new project
 * @authenticated
 * @bodyParam organizationId string required Organization ID
 * @bodyParam name string required Project name
 * @bodyParam description string optional Project description
 * @response 201 { "success": true, "data": { "project": {...} } }
 * @response 400 { "success": false, "error": "Validation error" }
 */
export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const body = await readBody(event)
  const result = createProjectSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { organizationId, name, description } = result.data

  // Verify membership
  await requireOrganizationMember(event, organizationId)

  // Create project
  const project = await Project.create({
    organization: organizationId,
    name,
    description,
    status: 'active',
    owner: auth.userId,
    members: [{ user: auth.userId, role: 'team', addedAt: new Date() }],
  })

  await project.populate('owner', 'name email avatar')

  // Create default tags
  await Tag.insertMany(
    DEFAULT_TAGS.map((tag) => ({ project: project._id, ...tag }))
  )

  // Create audit log
  const ctx = await auditContext(event, {
    organization: organizationId,
    project: project._id.toString(),
  })
  await createAuditLog(ctx, {
    action: 'create',
    resourceType: 'project',
    resourceId: project._id.toString(),
    resourceName: project.name,
  })

  setResponseStatus(event, 201)
  return {
    success: true,
    data: {
      project: {
        id: project._id,
        name: project.name,
        description: project.description,
        status: project.status,
        owner: project.owner,
        memberCount: project.members.length,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    },
  }
})
