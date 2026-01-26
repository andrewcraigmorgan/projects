import { Milestone } from '../../../../models/Milestone'
import { Project } from '../../../../models/Project'
import { MilestoneSignoff } from '../../../../models/MilestoneSignoff'
import { SpecificationApprover } from '../../../../models/SpecificationApprover'
import { requireOrganizationMember } from '../../../../utils/tenant'

/**
 * @group Specification
 * @description Get sign-off status and history for a milestone
 * @authenticated
 * @urlParam id string required Milestone ID
 * @response 200 { "success": true, "data": { "status": {...}, "signoffs": [...], "approvers": [...] } }
 */
export default defineEventHandler(async (event) => {
  const milestoneId = getRouterParam(event, 'id')
  if (!milestoneId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Milestone ID is required',
    })
  }

  const milestone = await Milestone.findById(milestoneId)
  if (!milestone) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Milestone not found',
    })
  }

  const project = await Project.findById(milestone.project)
  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Project not found',
    })
  }

  await requireOrganizationMember(event, project.organization.toString())

  // Get all approvers for the project
  const approvers = await SpecificationApprover.find({ project: project._id })
    .populate('user', 'name email avatar')

  // Get all sign-offs for this milestone
  const signoffs = await MilestoneSignoff.find({ milestone: milestoneId })
    .populate('signedBy', 'name email avatar')
    .sort({ signedAt: 1 })

  const signedUserIds = signoffs.map(s => (s.signedBy as any)._id.toString())

  // Calculate status
  const totalApprovers = approvers.length
  const signedCount = signoffs.length
  let status: 'pending' | 'partial' | 'complete' = 'pending'
  if (signedCount > 0 && signedCount < totalApprovers) {
    status = 'partial'
  } else if (signedCount >= totalApprovers && totalApprovers > 0) {
    status = 'complete'
  }

  return {
    success: true,
    data: {
      status: {
        status,
        totalApprovers,
        signedCount,
        isLocked: milestone.isLocked || false,
        lockedAt: milestone.lockedAt?.toISOString() || null,
      },
      signoffs: signoffs.map(s => ({
        id: s._id.toString(),
        signedBy: {
          id: (s.signedBy as any)._id.toString(),
          name: (s.signedBy as any).name,
          email: (s.signedBy as any).email,
          avatar: (s.signedBy as any).avatar,
        },
        signedAt: s.signedAt.toISOString(),
        notes: s.signatureNotes || '',
      })),
      approvers: approvers.map(a => ({
        id: a._id.toString(),
        user: {
          id: (a.user as any)._id.toString(),
          name: (a.user as any).name,
          email: (a.user as any).email,
          avatar: (a.user as any).avatar,
        },
        hasSigned: signedUserIds.includes((a.user as any)._id.toString()),
        signedAt: signoffs.find(s =>
          (s.signedBy as any)._id.toString() === (a.user as any)._id.toString()
        )?.signedAt?.toISOString() || null,
      })),
    },
  }
})
