import { z } from 'zod'
import { Project } from '../../../../models/Project'
import { User } from '../../../../models/User'
import { SpecificationApprover } from '../../../../models/SpecificationApprover'
import { requireOrganizationMember } from '../../../../utils/tenant'
import { auditContext, createAuditLog } from '../../../../services/audit'

const bodySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
})

/**
 * @group Specification
 * @description Add a specification approver to a project (must be a client member)
 * @authenticated
 * @urlParam id string required Project ID
 * @bodyParam userId string required User ID to add as approver
 * @response 201 { "success": true, "data": { "approver": {...} } }
 * @response 400 { "success": false, "error": "User must be a client member of the project" }
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

  const body = await readBody(event)
  const result = bodySchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { userId } = result.data

  const project = await Project.findById(projectId)
  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Project not found',
    })
  }

  const currentUser = await requireOrganizationMember(event, project.organization.toString())

  // Check if the user being added is a client member of the project
  const member = project.members.find((m: any) => m.user.toString() === userId)
  if (!member || member.role !== 'client') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'User must be a client member of the project to be an approver',
    })
  }

  // Check if user exists
  const user = await User.findById(userId)
  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'User not found',
    })
  }

  // Check if already an approver
  const existingApprover = await SpecificationApprover.findOne({
    project: projectId,
    user: userId,
  })
  if (existingApprover) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'User is already an approver for this project',
    })
  }

  const approver = await SpecificationApprover.create({
    project: projectId,
    user: userId,
    addedBy: currentUser._id,
    addedAt: new Date(),
  })

  // Create audit log
  const ctx = await auditContext(event, {
    organization: project.organization.toString(),
    project: projectId,
  })
  await createAuditLog(ctx, {
    action: 'add_approver',
    resourceType: 'approver',
    resourceId: approver._id.toString(),
    resourceName: user.name || user.email,
    metadata: { userId },
  })

  return {
    success: true,
    data: {
      approver: {
        id: approver._id.toString(),
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
        addedBy: {
          id: currentUser._id.toString(),
          name: currentUser.name,
          email: currentUser.email,
        },
        addedAt: approver.addedAt.toISOString(),
      },
    },
  }
})
