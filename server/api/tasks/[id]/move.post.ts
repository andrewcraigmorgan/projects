import { z } from 'zod'
import { Task } from '../../../models/Task'
import { Project } from '../../../models/Project'
import { requireOrganizationMember } from '../../../utils/tenant'

const moveTaskSchema = z.object({
  newParentTask: z.string().nullable(),
  newOrder: z.number().min(0).optional(),
})

/**
 * @group Tasks
 * @description Move a task to a different parent or reorder
 * @authenticated
 * @urlParam id string required Task ID
 * @bodyParam newParentTask string required New parent task ID (null for root level)
 * @bodyParam newOrder number optional New position order
 * @response 200 { "success": true, "data": { "task": {...} } }
 * @response 400 { "success": false, "error": "Cannot move task under itself" }
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
  const result = moveTaskSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { newParentTask, newOrder } = result.data

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

  // Prevent moving task under itself or its descendants
  if (newParentTask) {
    if (newParentTask === id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Cannot move task under itself',
      })
    }

    // Check if newParentTask is a descendant of this task
    const newParent = await Task.findById(newParentTask)
    if (!newParent) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'New parent task not found',
      })
    }

    if (newParent.path && newParent.path.includes(id)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Cannot move task under its own descendant',
      })
    }

    // Ensure same project
    if (newParent.project.toString() !== task.project.toString()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Cannot move task to a different project',
      })
    }
  }

  // Calculate new order if not specified
  let order = newOrder
  if (order === undefined) {
    const maxOrderTask = await Task.findOne({
      project: task.project,
      parentTask: newParentTask,
    }).sort({ order: -1 })
    order = maxOrderTask ? maxOrderTask.order + 1 : 0
  }

  // Update the task and recalculate path/depth
  task.parentTask = newParentTask as unknown as typeof task.parentTask
  task.order = order

  // Save will trigger the pre-save hook to update path and depth
  await task.save()

  // Update all descendants' paths
  await updateDescendantPaths(id)

  await task.populate('assignee', 'name email avatar')
  await task.populate('createdBy', 'name email avatar')

  const subtaskCount = await Task.countDocuments({ parentTask: id })

  return {
    success: true,
    data: {
      task: {
        id: task._id,
        project: task.project,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        dueDate: task.dueDate,
        parentTask: task.parentTask,
        depth: task.depth,
        path: task.path,
        order: task.order,
        subtaskCount,
        createdBy: task.createdBy,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      },
    },
  }
})

// Recursively update descendant paths after a move
async function updateDescendantPaths(parentId: string) {
  const parent = await Task.findById(parentId)
  if (!parent) return

  const children = await Task.find({ parentTask: parentId })

  for (const child of children) {
    const newPath = parent.path ? `${parent.path}/${parentId}` : parentId
    const newDepth = parent.depth + 1

    await Task.updateOne(
      { _id: child._id },
      { $set: { path: newPath, depth: newDepth } }
    )

    await updateDescendantPaths(child._id.toString())
  }
}
