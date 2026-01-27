import { z } from 'zod'
import { Comment } from '../../../../models/Comment'
import { Task } from '../../../../models/Task'
import { Project } from '../../../../models/Project'
import { requireOrganizationMember } from '../../../../utils/tenant'
import { auditContext, createAuditLog } from '../../../../services/audit'

const createCommentSchema = z.object({
  content: z.string().min(1).max(50000),
})

/**
 * @group Comments
 * @description Create a comment on a task
 * @authenticated
 * @urlParam id string required Task ID
 * @bodyParam content string required Comment content (supports HTML)
 * @response 201 { "success": true, "data": { "comment": {...} } }
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

  const body = await readBody(event)
  const result = createCommentSchema.safeParse(body)

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

  // Get user info for authorName
  const user = event.context.user

  // Create comment
  const comment = await Comment.create({
    task: taskId,
    author: auth.userId,
    authorEmail: auth.email,
    authorName: user?.name || auth.email,
    content: result.data.content,
    source: 'app',
  })

  await comment.populate('author', 'name email avatar')

  // Create audit log
  const ctx = await auditContext(event, {
    organization: project.organization.toString(),
    project: task.project.toString(),
  })
  await createAuditLog(ctx, {
    action: 'create',
    resourceType: 'comment',
    resourceId: comment._id.toString(),
    resourceName: `Comment on ${task.title}`,
    metadata: { taskId, taskTitle: task.title },
  })

  setResponseStatus(event, 201)
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
