import { z } from 'zod'
import { Milestone } from '../../../../models/Milestone'
import { Project } from '../../../../models/Project'
import { Task } from '../../../../models/Task'
import { User } from '../../../../models/User'
import { MilestoneSignoff } from '../../../../models/MilestoneSignoff'
import { SpecificationApprover } from '../../../../models/SpecificationApprover'
import { SpecificationSnapshot } from '../../../../models/SpecificationSnapshot'
import { requireOrganizationMember } from '../../../../utils/tenant'
import { auditContext, createAuditLog } from '../../../../services/audit'

const bodySchema = z.object({
  notes: z.string().optional(),
})

/**
 * @group Specification
 * @description Sign off a milestone (requires user to be a designated approver)
 * @authenticated
 * @urlParam id string required Milestone ID
 * @bodyParam notes string optional Notes for the sign-off
 * @response 201 { "success": true, "data": { "signoff": {...}, "milestoneNowLocked": boolean } }
 * @response 403 { "success": false, "error": "Not authorized to sign off this milestone" }
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

  const body = await readBody(event) || {}
  const result = bodySchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
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

  if (milestone.isLocked) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Milestone is already locked',
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

  // Check if current user is a designated approver
  const approver = await SpecificationApprover.findOne({
    project: project._id,
    user: currentUser._id,
  })

  if (!approver) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'You are not a designated approver for this project',
    })
  }

  // Check if user has already signed off this milestone
  const existingSignoff = await MilestoneSignoff.findOne({
    milestone: milestoneId,
    signedBy: currentUser._id,
  })

  if (existingSignoff) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'You have already signed off this milestone',
    })
  }

  // Create the sign-off
  const signoff = await MilestoneSignoff.create({
    milestone: milestoneId,
    project: project._id,
    signedBy: currentUser._id,
    signedAt: new Date(),
    signatureNotes: result.data.notes || '',
  })

  // Create audit log for signoff
  const ctx = await auditContext(event, {
    organization: project.organization.toString(),
    project: project._id.toString(),
  })
  await createAuditLog(ctx, {
    action: 'signoff',
    resourceType: 'signoff',
    resourceId: signoff._id.toString(),
    resourceName: milestone.name,
    metadata: {
      milestoneId,
      milestoneName: milestone.name,
      notes: result.data.notes,
    },
  })

  // Check if all approvers have now signed off
  const totalApprovers = await SpecificationApprover.countDocuments({ project: project._id })
  const totalSignoffs = await MilestoneSignoff.countDocuments({ milestone: milestoneId })

  let milestoneNowLocked = false

  if (totalSignoffs >= totalApprovers && totalApprovers > 0) {
    // All approvers have signed - lock the milestone
    milestone.isLocked = true
    milestone.lockedAt = new Date()
    milestone.lockedBy = currentUser._id
    await milestone.save()
    milestoneNowLocked = true

    // Audit log for milestone lock
    await createAuditLog(ctx, {
      action: 'lock',
      resourceType: 'milestone',
      resourceId: milestoneId,
      resourceName: milestone.name,
      metadata: {
        totalApprovers,
        totalSignoffs,
      },
    })

    // Create a snapshot of the milestone's tasks
    await createMilestoneSnapshot(milestone, project, currentUser._id)
  }

  return {
    success: true,
    data: {
      signoff: {
        id: signoff._id.toString(),
        milestone: milestoneId,
        signedBy: {
          id: currentUser._id.toString(),
          name: currentUser.name,
          email: currentUser.email,
        },
        signedAt: signoff.signedAt.toISOString(),
        notes: signoff.signatureNotes || '',
      },
      milestoneNowLocked,
      signoffProgress: {
        signed: totalSignoffs,
        total: totalApprovers,
      },
    },
  }
})

async function createMilestoneSnapshot(
  milestone: any,
  project: any,
  createdBy: any
) {
  // Get all tasks for this milestone
  const tasks = await Task.find({ milestone: milestone._id })
    .populate('assignees', 'name')
    .sort({ order: 1 })

  // Get all sign-offs
  const signoffs = await MilestoneSignoff.find({ milestone: milestone._id })
    .populate('signedBy', 'name')

  // Build task hierarchy
  const buildSnapshotTasks = (parentId: string | null, allTasks: any[]): any[] => {
    return allTasks
      .filter(t => (t.parentTask?.toString() || null) === parentId)
      .sort((a, b) => a.order - b.order)
      .map(t => ({
        taskNumber: t.taskNumber,
        title: t.title,
        description: t.description || '',
        status: t.status,
        priority: t.priority,
        assignees: t.assignees?.map((a: any) => a.name) || [],
        dueDate: t.dueDate,
        subtasks: buildSnapshotTasks(t._id.toString(), allTasks),
      }))
  }

  // Get next version number
  const lastSnapshot = await SpecificationSnapshot.findOne({
    project: project._id,
    milestone: milestone._id,
  }).sort({ version: -1 })
  const nextVersion = (lastSnapshot?.version || 0) + 1

  await SpecificationSnapshot.create({
    project: project._id,
    milestone: milestone._id,
    version: nextVersion,
    snapshotData: {
      milestone: {
        name: milestone.name,
        description: milestone.description,
        startDate: milestone.startDate,
        endDate: milestone.endDate,
        status: milestone.status,
      },
      tasks: buildSnapshotTasks(null, tasks),
      signoffs: signoffs.map(s => ({
        userName: (s.signedBy as any).name,
        signedAt: s.signedAt,
        notes: s.signatureNotes,
      })),
      generatedAt: new Date(),
    },
    createdBy,
  })
}
