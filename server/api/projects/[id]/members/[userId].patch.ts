import { z } from 'zod'
import { Project } from '../../../../models/Project'
import { requireOrganizationMember } from '../../../../utils/tenant'

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

  ;(member as any).role = role
  await project.save()

  return {
    success: true,
    message: 'Member role updated',
  }
})
