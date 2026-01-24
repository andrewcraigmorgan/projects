import { Invitation } from '../../models/Invitation'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) {
    throw createError({ statusCode: 400, message: 'Token is required' })
  }

  const invitation = await Invitation.findOne({
    token,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  })
    .populate('project', 'name description')
    .populate('invitedBy', 'name')

  if (!invitation) {
    throw createError({ statusCode: 404, message: 'Invitation not found or expired' })
  }

  return {
    success: true,
    data: {
      invitation: {
        email: invitation.email,
        role: invitation.role,
        project: invitation.project,
        invitedBy: invitation.invitedBy,
        expiresAt: invitation.expiresAt,
      },
    },
  }
})
