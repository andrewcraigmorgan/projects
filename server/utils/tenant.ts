import type { H3Event } from 'h3'
import { Organization } from '../models/Organization'
import type { OrgRole } from '~/types'

export async function requireOrganizationMember(
  event: H3Event,
  organizationId: string,
  requiredRoles?: OrgRole[]
) {
  const auth = event.context.auth
  if (!auth) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const org = await Organization.findById(organizationId)
  if (!org) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Organization not found',
    })
  }

  const member = org.members.find(
    (m) => m.user.toString() === auth.userId
  )

  if (!member) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'You are not a member of this organization',
    })
  }

  if (requiredRoles && !requiredRoles.includes(member.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: `This action requires one of these roles: ${requiredRoles.join(', ')}`,
    })
  }

  return { organization: org, memberRole: member.role }
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
