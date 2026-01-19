import { TaskSubscription } from '../../../models/TaskSubscription'
import { Task } from '../../../models/Task'
import { Project } from '../../../models/Project'
import { requireOrganizationMember } from '../../../utils/tenant'

/**
 * @group Task Subscriptions
 * @description List all subscribers for a task
 * @authenticated
 * @urlParam id string required Task ID
 * @response 200 { "success": true, "data": { "subscribers": [...], "total": 0 } }
 */
export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const taskId = getRouterParam(event, 'id')
  if (!taskId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Task ID is required',
    })
  }

  // Verify task exists
  const task = await Task.findById(taskId)
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

  // Get subscribers
  const subscriptions = await TaskSubscription.find({ task: taskId })
    .populate('user', 'name email avatar')
    .sort({ subscribedAt: 1 })

  return {
    success: true,
    data: {
      subscribers: subscriptions.map((s) => ({
        user: s.user,
        subscribedAt: s.subscribedAt,
      })),
      total: subscriptions.length,
    },
  }
})
