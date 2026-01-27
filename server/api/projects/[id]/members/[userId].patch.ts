import { z } from 'zod'
import { Project } from '../../../../models/Project'
import { User } from '../../../../models/User'
import { requireOrganizationMember } from '../../../../utils/tenant'
import { auditContext, createAuditLog } from '../../../../services/audit'

const updateSchema = z.object({
  role: z.enum(['team', 'client']),
})

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id')
  const userId = getRouterParam(event, 'userId')

  if (!projectId || !userId) {
    throw createError({ statusCode: 400, message: 'Project ID and User ID are required' })
  }

  const body = await readBody(event)
  const result = updateSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { role } = result.data

  const project = await Project.findById(projectId)
  if (!project) {
    throw createError({ statusCode: 404, message: 'Project not found' })
  }

  // Verify caller is an org member
  await requireOrganizationMember(event, project.organization.toString())

  // Find and update the member's role
  const member = project.members.find(
    (m: any) => {
      const mUserId = m.user?._id?.toString?.() || m.user?.toString?.()
      return mUserId === userId
    }
  )

  if (!member) {
    throw createError({ statusCode: 404, message: 'Member not found in project' })
  }

  const oldRole = (member as any).role
  ;(member as any).role = role
  await project.save()

  // Create audit log for role change
  const targetUser = await User.findById(userId).select('name email')
  const ctx = await auditContext(event, {
    organization: project.organization.toString(),
    project: projectId,
  })
  await createAuditLog(ctx, {
    action: 'change_role',
    resourceType: 'member',
    resourceId: userId,
    resourceName: targetUser?.name || targetUser?.email || userId,
    changes: [{ field: 'role', oldValue: oldRole, newValue: role }],
  })

  return {
    success: true,
    message: 'Member role updated',
  }
})
