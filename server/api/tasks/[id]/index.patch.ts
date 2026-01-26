import { z } from 'zod'
import { Task } from '../../../models/Task'
import { Project } from '../../../models/Project'
import { Milestone } from '../../../models/Milestone'
import { requireOrganizationMember } from '../../../utils/tenant'

const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional(),
  status: z.enum(['todo', 'awaiting_approval', 'open', 'in_review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).nullable().optional(),
  assignees: z.array(z.string()).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  order: z.number().min(0).optional(),
  milestone: z.string().nullable().optional(),
})

/**
 * @group Tasks
 * @description Update a task
 * @authenticated
 * @urlParam id string required Task ID
 * @bodyParam title string optional Task title
 * @bodyParam description string optional Task description
 * @bodyParam status string optional Task status
 * @bodyParam priority string optional Task priority
 * @bodyParam assignees string[] optional Array of User IDs
 * @bodyParam dueDate string optional Due date (null to clear)
 * @bodyParam order number optional Position order
 * @response 200 { "success": true, "data": { "task": {...} } }
 * @response 404 { "success": false, "error": "Task not found" }
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Task ID is required',
    })
  }

  const body = await readBody(event)
  const result = updateTaskSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const task = await Task.findById(id)
  if (!task) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Task not found',
    })
  }

  // Verify project access
  const project = await Project.findById(task.project)
  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Project not found',
    })
  }

  await requireOrganizationMember(event, project.organization.toString())

  // Check if task's current milestone is locked
  if (task.milestone) {
    const currentMilestone = await Milestone.findById(task.milestone)
    if (currentMilestone?.isLocked) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: 'Cannot modify a task in a locked milestone. The milestone has been signed off.',
      })
    }
  }

  // Check if trying to move to a locked milestone
  if (result.data.milestone) {
    const targetMilestone = await Milestone.findById(result.data.milestone)
    if (!targetMilestone) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Target milestone not found',
      })
    }
    if (targetMilestone.project.toString() !== task.project.toString()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Milestone must belong to the same project',
      })
    }
    if (targetMilestone.isLocked) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: 'Cannot move task to a locked milestone. The milestone has been signed off.',
      })
    }
  }

  // Prepare update data
  const updateData: Record<string, unknown> = { ...result.data }

  // Handle dueDate conversion
  if (result.data.dueDate !== undefined) {
    updateData.dueDate = result.data.dueDate
      ? new Date(result.data.dueDate)
      : null
  }

  // Update task
  const updatedTask = await Task.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true }
  )
    .populate('assignees', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('milestone', 'name')

  // Get subtask count
  const subtaskCount = await Task.countDocuments({ parentTask: id })

  return {
    success: true,
    data: {
      task: {
        id: updatedTask!._id,
        project: updatedTask!.project,
        title: updatedTask!.title,
        description: updatedTask!.description,
        status: updatedTask!.status,
        priority: updatedTask!.priority,
        assignees: updatedTask!.assignees,
        dueDate: updatedTask!.dueDate,
        parentTask: updatedTask!.parentTask,
        milestone: updatedTask!.milestone,
        depth: updatedTask!.depth,
        order: updatedTask!.order,
        subtaskCount,
        createdBy: updatedTask!.createdBy,
        createdAt: updatedTask!.createdAt,
        updatedAt: updatedTask!.updatedAt,
      },
    },
  }
})
