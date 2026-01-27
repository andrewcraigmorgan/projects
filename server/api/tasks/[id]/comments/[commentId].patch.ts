import { z } from 'zod'
import { Comment } from '../../../../models/Comment'
import { Task } from '../../../../models/Task'
import { Project } from '../../../../models/Project'
import { requireOrganizationMember } from '../../../../utils/tenant'
import { auditContext, createAuditLog } from '../../../../services/audit'

const updateCommentSchema = z.object({
  content: z.string().min(1).max(50000),
})

/**
 * @group Comments
 * @description Update a comment on a task (author only)
 * @authenticated
 * @urlParam id string required Task ID
 * @urlParam commentId string required Comment ID
 * @bodyParam content string required Comment content (supports HTML)
 * @response 200 { "success": true, "data": { "comment": {...} } }
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

  const body = await readBody(event)
  const result = updateCommentSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
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
      message: 'You can only edit your own comments',
    })
  }

  // Capture old content for audit log
  const oldContent = comment.content

  // Update the comment
  comment.content = result.data.content
  await comment.save()

  await comment.populate('author', 'name email avatar')

  // Create audit log
  const ctx = await auditContext(event, {
    organization: project.organization.toString(),
    project: task.project.toString(),
  })
  await createAuditLog(ctx, {
    action: 'update',
    resourceType: 'comment',
    resourceId: commentId,
    resourceName: `Comment on ${task.title}`,
    changes: [{ field: 'content', oldValue: oldContent, newValue: result.data.content }],
    metadata: { taskId, taskTitle: task.title },
  })

  return {
    success: true,
    data: {
      comment: {
        id: comment._id,
        task: comment.task,
        author: comment.author,
        authorEmail: comment.authorEmail,
        authorName: comment.authorName,
        content: comment.content,
        source: comment.source,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      },
    },
  }
})
