import { z } from 'zod'
import { Task } from '../../../models/Task'
import { Project } from '../../../models/Project'
import { Organization } from '../../../models/Organization'
import { requireOrganizationMember } from '../../../utils/tenant'

const moveTaskSchema = z.object({
  newParentTask: z.string().nullable(),
  newOrder: z.number().min(0).optional(),
  newProject: z.string().optional(),
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

  const { newParentTask, newOrder, newProject } = result.data

  const task = await Task.findById(id)
  if (!task) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Task not found',
    })
  }

  // Verify source project access
  const sourceProject = await Project.findById(task.project)
  if (!sourceProject) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Project not found',
    })
  }

  await requireOrganizationMember(event, sourceProject.organization.toString())

  // Handle cross-project move
  const isCrossProjectMove = newProject && newProject !== task.project.toString()
  let destinationProject = sourceProject
  let crossProjectMoveInfo: {
    fromProject: string
    toProject: string
    clearedFields: string[]
    descendantsMoved: number
  } | undefined

  if (isCrossProjectMove) {
    // Validate destination project exists
    destinationProject = await Project.findById(newProject)
    if (!destinationProject) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Destination project not found',
      })
    }

    // Verify user has access to destination organization
    await requireOrganizationMember(event, destinationProject.organization.toString())

    // Initialize cross-project move info
    crossProjectMoveInfo = {
      fromProject: sourceProject._id.toString(),
      toProject: destinationProject._id.toString(),
      clearedFields: [],
      descendantsMoved: 0,
    }
  }

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

    // For same-project moves with parent, ensure parent is in the same project
    // For cross-project moves, ensure the parent is in the destination project
    const targetProjectId = isCrossProjectMove ? newProject : task.project.toString()
    if (newParent.project.toString() !== targetProjectId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Parent task must be in the destination project',
      })
    }
  }

  // Calculate new order if not specified
  const targetProjectId = isCrossProjectMove ? newProject : task.project.toString()
  let order = newOrder
  if (order === undefined) {
    const maxOrderTask = await Task.findOne({
      project: targetProjectId,
      parentTask: newParentTask,
    }).sort({ order: -1 })
    order = maxOrderTask ? maxOrderTask.order + 1 : 0
  }

  // Update the task and recalculate path/depth
  task.parentTask = newParentTask as unknown as typeof task.parentTask
  task.order = order

  // Handle cross-project move field clearing
  if (isCrossProjectMove && crossProjectMoveInfo) {
    // Update project
    task.project = destinationProject._id

    // Clear milestone (project-scoped)
    if (task.milestone) {
      task.milestone = undefined
      crossProjectMoveInfo.clearedFields.push('milestone')
    }

    // Clear tags (project-scoped)
    if (task.tags && task.tags.length > 0) {
      task.tags = []
      crossProjectMoveInfo.clearedFields.push('tags')
    }

    // Clear assignee if not a member of destination organization
    if (task.assignee) {
      const destOrg = await Organization.findById(destinationProject.organization)
      const isAssigneeMember = destOrg?.members.some(
        (m) => m.user.toString() === task.assignee?.toString()
      )
      if (!isAssigneeMember) {
        task.assignee = undefined
        crossProjectMoveInfo.clearedFields.push('assignee')
      }
    }
  }

  // Save will trigger the pre-save hook to update path and depth
  await task.save()

  // Update all descendants' paths (and project for cross-project moves)
  const descendantCount = await updateDescendantPaths(
    id,
    isCrossProjectMove ? destinationProject._id.toString() : undefined,
    isCrossProjectMove ? destinationProject.organization.toString() : undefined
  )
  if (crossProjectMoveInfo) {
    crossProjectMoveInfo.descendantsMoved = descendantCount
  }

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
      ...(crossProjectMoveInfo && { crossProjectMove: crossProjectMoveInfo }),
    },
  }
})

// Recursively update descendant paths after a move
// For cross-project moves, also update project and clear scoped fields
async function updateDescendantPaths(
  parentId: string,
  newProjectId?: string,
  destOrgId?: string
): Promise<number> {
  const parent = await Task.findById(parentId)
  if (!parent) return 0

  const children = await Task.find({ parentTask: parentId })
  let count = 0

  for (const child of children) {
    const newPath = parent.path ? `${parent.path}/${parentId}` : parentId
    const newDepth = parent.depth + 1

    const updateFields: Record<string, unknown> = {
      path: newPath,
      depth: newDepth,
    }

    // For cross-project moves, update project and clear scoped fields
    if (newProjectId) {
      updateFields.project = newProjectId
      updateFields.milestone = null
      updateFields.tags = []

      // Clear assignee if not a member of destination organization
      if (child.assignee && destOrgId) {
        const destOrg = await Organization.findById(destOrgId)
        const isAssigneeMember = destOrg?.members.some(
          (m) => m.user.toString() === child.assignee?.toString()
        )
        if (!isAssigneeMember) {
          updateFields.assignee = null
        }
      }
    }

    await Task.updateOne({ _id: child._id }, { $set: updateFields })
    count++

    count += await updateDescendantPaths(child._id.toString(), newProjectId, destOrgId)
  }

  return count
}
