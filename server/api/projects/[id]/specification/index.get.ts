import { Project } from '../../../../models/Project'
import { Milestone } from '../../../../models/Milestone'
import { Task } from '../../../../models/Task'
import { MilestoneSignoff } from '../../../../models/MilestoneSignoff'
import { SpecificationApprover } from '../../../../models/SpecificationApprover'
import { requireOrganizationMember } from '../../../../utils/tenant'

/**
 * @group Specification
 * @description Get project specification data (tasks grouped by milestone)
 * @authenticated
 * @urlParam id string required Project ID
 * @response 200 { "success": true, "data": { "specification": {...} } }
 * @response 404 { "success": false, "error": "Project not found" }
 */
export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id')
  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Project ID is required',
    })
  }

  const project = await Project.findById(projectId)
    .populate('owner', 'name email')

  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Project not found',
    })
  }

  await requireOrganizationMember(event, project.organization.toString())

  // Get all milestones for the project
  const milestones = await Milestone.find({ project: projectId })
    .populate('lockedBy', 'name email')
    .sort({ startDate: 1, name: 1 })

  // Get all tasks for the project
  const tasks = await Task.find({ project: projectId })
    .populate('assignees', 'name email avatar')
    .populate('milestone', 'name')
    .populate('createdBy', 'name email')
    .sort({ milestone: 1, order: 1 })

  // Get all approvers for the project
  const approvers = await SpecificationApprover.find({ project: projectId })
    .populate('user', 'name email avatar')

  // Get all sign-offs for this project's milestones
  const milestoneIds = milestones.map(m => m._id)
  const signoffs = await MilestoneSignoff.find({ milestone: { $in: milestoneIds } })
    .populate('signedBy', 'name email')

  // Build task hierarchy helper
  const buildTaskHierarchy = (parentId: string | null, allTasks: any[]): any[] => {
    return allTasks
      .filter(t => {
        const taskParent = t.parentTask?.toString() || null
        return taskParent === parentId
      })
      .sort((a, b) => a.order - b.order)
      .map(t => ({
        id: t._id.toString(),
        taskNumber: t.taskNumber,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assignees: t.assignees?.map((a: any) => ({
          id: a._id?.toString(),
          name: a.name,
          email: a.email,
          avatar: a.avatar,
        })) || [],
        dueDate: t.dueDate?.toISOString() || null,
        milestone: t.milestone ? {
          id: t.milestone._id?.toString(),
          name: t.milestone.name,
        } : null,
        subtasks: buildTaskHierarchy(t._id.toString(), allTasks),
      }))
  }

  // Group tasks by milestone
  const milestoneData = milestones.map(m => {
    const milestoneTasks = tasks.filter(t =>
      t.milestone?._id?.toString() === m._id.toString()
    )
    const rootTasks = buildTaskHierarchy(null, milestoneTasks)

    // Get sign-offs for this milestone
    const milestoneSignoffs = signoffs.filter(s =>
      s.milestone.toString() === m._id.toString()
    )

    // Calculate sign-off status
    const totalApprovers = approvers.length
    const signedCount = milestoneSignoffs.length
    let signoffStatus: 'pending' | 'partial' | 'complete' = 'pending'
    if (signedCount > 0 && signedCount < totalApprovers) {
      signoffStatus = 'partial'
    } else if (signedCount >= totalApprovers && totalApprovers > 0) {
      signoffStatus = 'complete'
    }

    return {
      id: m._id.toString(),
      name: m.name,
      description: m.description || '',
      startDate: m.startDate?.toISOString() || null,
      endDate: m.endDate?.toISOString() || null,
      status: m.status,
      isLocked: m.isLocked || false,
      lockedAt: m.lockedAt?.toISOString() || null,
      lockedBy: m.lockedBy ? {
        id: (m.lockedBy as any)._id?.toString(),
        name: (m.lockedBy as any).name,
      } : null,
      signoffStatus: {
        status: signoffStatus,
        totalApprovers,
        signedCount,
        signoffs: milestoneSignoffs.map(s => ({
          id: s._id.toString(),
          signedBy: {
            id: (s.signedBy as any)._id?.toString(),
            name: (s.signedBy as any).name,
            email: (s.signedBy as any).email,
          },
          signedAt: s.signedAt.toISOString(),
          notes: s.signatureNotes || '',
        })),
      },
      tasks: rootTasks,
      taskStats: {
        total: milestoneTasks.length,
        completed: milestoneTasks.filter(t => t.status === 'done').length,
      },
    }
  })

  // Also include unassigned tasks (tasks without a milestone)
  const unassignedTasks = tasks.filter(t => !t.milestone)
  const unassignedRootTasks = buildTaskHierarchy(null, unassignedTasks)

  return {
    success: true,
    data: {
      specification: {
        project: {
          id: project._id.toString(),
          name: project.name,
          code: project.code,
          description: project.description,
          owner: {
            id: (project.owner as any)._id?.toString(),
            name: (project.owner as any).name,
          },
        },
        generatedAt: new Date().toISOString(),
        approvers: approvers.map(a => ({
          id: a._id.toString(),
          user: {
            id: (a.user as any)._id?.toString(),
            name: (a.user as any).name,
            email: (a.user as any).email,
            avatar: (a.user as any).avatar,
          },
          addedAt: a.addedAt.toISOString(),
        })),
        milestones: milestoneData,
        unassignedTasks: unassignedRootTasks.length > 0 ? {
          tasks: unassignedRootTasks,
          taskStats: {
            total: unassignedTasks.length,
            completed: unassignedTasks.filter(t => t.status === 'done').length,
          },
        } : null,
      },
    },
  }
})
