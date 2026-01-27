import { z } from 'zod'
import { Invitation } from '../../models/Invitation'
import { Project } from '../../models/Project'
import { User } from '../../models/User'
import { Organization } from '../../models/Organization'
import { verifyPassword, generateToken } from '../../utils/auth'
import { createAuditLog } from '../../services/audit'

const acceptSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = acceptSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { token, email, password, rememberMe } = result.data

  // Find the invitation
  const invitation = await Invitation.findOne({
    token,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  })

  if (!invitation) {
    throw createError({ statusCode: 404, message: 'Invitation not found or expired' })
  }

  // Email must match the invitation
  if (invitation.email !== email.toLowerCase()) {
    throw createError({ statusCode: 400, message: 'Email does not match invitation' })
  }

  // Find the existing user
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found. Please use the signup form.' })
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password)
  if (!isValid) {
    throw createError({ statusCode: 401, message: 'Invalid password' })
  }

  // Add user to project
  const project = await Project.findById(invitation.project)
  if (!project) {
    throw createError({ statusCode: 404, message: 'Project not found' })
  }

  // Check if already a member
  const isMember = project.members.some(
    (m: any) => {
      const userId = m.user?._id?.toString?.() || m.user?.toString?.()
      return userId === user._id.toString()
    }
  )

  if (!isMember) {
    project.members.push({
      user: user._id,
      role: invitation.role,
      addedAt: new Date(),
      addedBy: invitation.invitedBy,
    } as any)
    await project.save()
  }

  // Add user to organization if not already a member
  const org = await Organization.findById(project.organization)
  if (org) {
    const isOrgMember = org.members.some(
      (m: any) => m.user.toString() === user._id.toString()
    )
    if (!isOrgMember) {
      org.members.push({
        user: user._id,
        role: 'member',
        joinedAt: new Date(),
      } as any)
      await org.save()

      // Add org to user's organizations
      if (!user.organizations.some((o: any) => o.toString() === org._id.toString())) {
        user.organizations.push(org._id)
        await user.save()
      }
    }
  }

  // Mark invitation as accepted
  invitation.status = 'accepted'
  await invitation.save()

  // Create audit log for invitation acceptance
  await createAuditLog(
    {
      actor: {
        userId: user._id,
        email: user.email,
        name: user.name,
        authMethod: 'session',
      },
      organization: project.organization.toString(),
      project: project._id.toString(),
    },
    {
      action: 'accept_invite',
      resourceType: 'invitation',
      resourceId: invitation._id.toString(),
      resourceName: user.email,
      metadata: { role: invitation.role, projectName: project.name },
    }
  )

  // Generate auth token
  const authToken = generateToken(
    { userId: user._id.toString(), email: user.email },
    rememberMe ? '30d' : '7d'
  )

  return {
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        organizations: user.organizations,
      },
      token: authToken,
      projectId: project._id.toString(),
    },
  }
})
