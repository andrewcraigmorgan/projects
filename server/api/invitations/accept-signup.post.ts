import { z } from 'zod'
import { Invitation } from '../../models/Invitation'
import { Project } from '../../models/Project'
import { User } from '../../models/User'
import { Organization } from '../../models/Organization'
import { hashPassword, generateToken } from '../../utils/auth'
import { createAuditLog } from '../../services/audit'

const signupSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional(),
  rememberMe: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = signupSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { token, password, name, rememberMe } = result.data

  // Find the invitation
  const invitation = await Invitation.findOne({
    token,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  })

  if (!invitation) {
    throw createError({ statusCode: 404, message: 'Invitation not found or expired' })
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: invitation.email })
  if (existingUser) {
    throw createError({
      statusCode: 409,
      message: 'An account with this email already exists. Please sign in instead.',
    })
  }

  // Find the project
  const project = await Project.findById(invitation.project)
  if (!project) {
    throw createError({ statusCode: 404, message: 'Project not found' })
  }

  // Create user
  const hashedPassword = await hashPassword(password)
  const user = await User.create({
    email: invitation.email,
    password: hashedPassword,
    name: name || invitation.email.split('@')[0],
    organizations: [],
  })

  // Add user to organization
  const org = await Organization.findById(project.organization)
  if (org) {
    org.members.push({
      user: user._id,
      role: 'member',
      joinedAt: new Date(),
    } as any)
    await org.save()

    user.organizations.push(org._id)
    await user.save()
  }

  // Add user to project
  project.members.push({
    user: user._id,
    role: invitation.role,
    addedAt: new Date(),
    addedBy: invitation.invitedBy,
  } as any)
  await project.save()

  // Mark invitation as accepted
  invitation.status = 'accepted'
  await invitation.save()

  // Create audit log for invitation acceptance (new user signup)
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
      metadata: { role: invitation.role, projectName: project.name, isNewUser: true },
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
