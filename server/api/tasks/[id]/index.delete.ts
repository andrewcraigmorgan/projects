import { Task } from '../../../models/Task'
import { Project } from '../../../models/Project'
import { Milestone } from '../../../models/Milestone'
import { requireOrganizationMember } from '../../../utils/tenant'
import { auditContext, createAuditLog } from '../../../services/audit'

/**
 * @group Tasks
 * @description Delete a task and all its subtasks recursively
 * @authenticated
 * @urlParam id string required Task ID
 * @response 200 { "success": true, "message": "Task deleted" }
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

  // Check if task's milestone is locked
  if (task.milestone) {
    const milestone = await Milestone.findById(task.milestone)
    if (milestone?.isLocked) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: 'Cannot delete a task in a locked milestone. The milestone has been signed off.',
      })
    }
  }

  // Create audit log before deletion
  const ctx = await auditContext(event, {
    organization: project.organization.toString(),
    project: task.project.toString(),
  })
  await createAuditLog(ctx, {
    action: 'delete',
    resourceType: 'task',
    resourceId: id,
    resourceName: task.title,
  })

  // Delete task and all descendants using the path field
  // Tasks that have this task in their path are descendants
  const pathPattern = task.path ? `${task.path}/${id}` : id
  await Task.deleteMany({
    $or: [
      { _id: id },
      { path: { $regex: `^${pathPattern}` } },
    ],
  })

  return {
    success: true,
    message: 'Task and all subtasks deleted successfully',
  }
})
