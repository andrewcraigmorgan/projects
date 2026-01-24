import { Comment } from '../../../../models/Comment'
import { Task } from '../../../../models/Task'
import { Project } from '../../../../models/Project'
import { requireOrganizationMember } from '../../../../utils/tenant'

/**
 * @group Comments
 * @description Delete a comment on a task (author only)
 * @authenticated
 * @urlParam id string required Task ID
 * @urlParam commentId string required Comment ID
 * @response 200 { "success": true }
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
  const commentId = getRouterParam(event, 'commentId')

  if (!taskId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Task ID is required',
    })
  }

  if (!commentId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Comment ID is required',
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

  // Find the comment
  const comment = await Comment.findById(commentId)
  if (!comment) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Comment not found',
    })
  }

  // Verify comment belongs to task
  if (comment.task.toString() !== taskId) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Comment not found',
    })
  }

  // Verify user is the comment author
  if (!comment.author || comment.author.toString() !== auth.userId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'You can only delete your own comments',
    })
  }

  // Delete the comment
  await comment.deleteOne()

  return {
    success: true,
  }
})
