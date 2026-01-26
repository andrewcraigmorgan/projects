import { Milestone } from '../../../../models/Milestone'
import { Project } from '../../../../models/Project'
import { MilestoneSignoff } from '../../../../models/MilestoneSignoff'
import { requireOrganizationMember } from '../../../../utils/tenant'

/**
 * @group Specification
 * @description Revoke a sign-off and unlock milestone (project owner only)
 * @authenticated
 * @urlParam id string required Milestone ID
 * @urlParam signoffId string required Sign-off ID to revoke
 * @response 200 { "success": true, "message": "Sign-off revoked", "milestoneUnlocked": boolean }
 * @response 403 { "success": false, "error": "Only project owner can revoke sign-offs" }
 */
export default defineEventHandler(async (event) => {
  const milestoneId = getRouterParam(event, 'id')
  const signoffId = getRouterParam(event, 'signoffId')

  if (!milestoneId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Milestone ID is required',
    })
  }

  if (!signoffId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Sign-off ID is required',
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

  const currentUser = await requireOrganizationMember(event, project.organization.toString())

  // Only project owner can revoke sign-offs
  if (project.owner.toString() !== currentUser._id.toString()) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Only the project owner can revoke sign-offs',
    })
  }

  const signoff = await MilestoneSignoff.findOne({
    _id: signoffId,
    milestone: milestoneId,
  })

  if (!signoff) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Sign-off not found',
    })
  }

  await signoff.deleteOne()

  // Unlock the milestone since a sign-off was revoked
  let milestoneUnlocked = false
  if (milestone.isLocked) {
    milestone.isLocked = false
    milestone.lockedAt = undefined
    milestone.lockedBy = undefined
    await milestone.save()
    milestoneUnlocked = true
  }

  return {
    success: true,
    message: 'Sign-off revoked successfully',
    milestoneUnlocked,
  }
})
