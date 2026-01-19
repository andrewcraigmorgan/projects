import { z } from 'zod'
import { Comment } from '../../../../models/Comment'
import { Task } from '../../../../models/Task'
import { Project } from '../../../../models/Project'
import { requireOrganizationMember } from '../../../../utils/tenant'

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
})

/**
 * @group Comments
 * @description List comments on a task
 * @authenticated
 * @urlParam id string required Task ID
 * @queryParam page number optional Page number (default: 1)
 * @queryParam limit number optional Items per page (default: 50, max: 100)
 * @response 200 { "success": true, "data": { "comments": [...], "total": 0 } }
 */
export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, 'id')
  if (!taskId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Task ID is required',
    })
  }

  const query = getQuery(event)
  const result = querySchema.safeParse(query)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { page, limit } = result.data

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

  // Get comments
  const [comments, total] = await Promise.all([
    Comment.find({ task: taskId })
      .populate('author', 'name email avatar')
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Comment.countDocuments({ task: taskId }),
  ])

  return {
    success: true,
    data: {
      comments: comments.map((c) => ({
        id: c._id,
        task: c.task,
        author: c.author,
        authorEmail: c.authorEmail,
        authorName: c.authorName,
        content: c.content,
        source: c.source,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  }
})
