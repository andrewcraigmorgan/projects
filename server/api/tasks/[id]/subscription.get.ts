import { TaskSubscription } from '../../../models/TaskSubscription'
import { Task } from '../../../models/Task'
import { Project } from '../../../models/Project'
import { requireOrganizationMember } from '../../../utils/tenant'

/**
 * @group Task Subscriptions
 * @description Check if current user is subscribed to a task
 * @authenticated
 * @urlParam id string required Task ID
 * @response 200 { "success": true, "data": { "subscribed": true|false, "subscribedAt": "..." } }
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

  // Check subscription
  const subscription = await TaskSubscription.findOne({
    task: taskId,
    user: auth.userId,
  })

  return {
    success: true,
    data: {
      subscribed: !!subscription,
      subscribedAt: subscription?.subscribedAt || null,
    },
  }
})
