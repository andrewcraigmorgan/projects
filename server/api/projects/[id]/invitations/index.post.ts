import { z } from 'zod'
import { Project } from '../../../../models/Project'
import { Invitation } from '../../../../models/Invitation'
import { User } from '../../../../models/User'
import { generateSecureToken } from '../../../../utils/auth'
import { sendProjectInvitation } from '../../../../utils/email'
import { requireOrganizationMember } from '../../../../utils/tenant'

const APP_URL = process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['team', 'client']).default('client'),
})

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id')
  if (!projectId) {
    throw createError({ statusCode: 400, message: 'Project ID is required' })
  }

  const body = await readBody(event)
  const result = inviteSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { email, role } = result.data
  const auth = event.context.auth!

  const project = await Project.findById(projectId)
  if (!project) {
    throw createError({ statusCode: 404, message: 'Project not found' })
  }

  // Verify caller is an org member
  await requireOrganizationMember(event, project.organization.toString())

  // Check by email if already a member
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    const isMember = project.members.some(
      (m: any) => {
        const userId = m.user?._id?.toString?.() || m.user?.toString?.()
        return userId === existingUser._id.toString()
      }
    )
    if (isMember) {
      throw createError({ statusCode: 409, message: 'User is already a project member' })
    }
  }

  // Check if there's already a pending invitation for this email + project
  const existingInvite = await Invitation.findOne({
    email,
    project: projectId,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  })

  if (existingInvite) {
    throw createError({ statusCode: 409, message: 'An invitation is already pending for this email' })
  }

  // Create invitation
  const token = generateSecureToken()
  const invitation = await Invitation.create({
    email,
    project: projectId,
    role,
    token,
    status: 'pending',
    invitedBy: auth.userId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  })

  // Send invitation email
  const inviter = await User.findById(auth.userId)
  const acceptUrl = `${APP_URL}/invite/${token}`

  await sendProjectInvitation(email, {
    projectName: project.name,
    inviterName: inviter?.name || 'A team member',
    role,
    acceptUrl,
  })

  return {
    success: true,
    data: {
      invitation: {
        id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      },
    },
  }
})
