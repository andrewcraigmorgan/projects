import { z } from 'zod'
import { Task } from '../../models/Task'
import { Project } from '../../models/Project'
import { requireOrganizationMember } from '../../utils/tenant'

const querySchema = z.object({
  projectId: z.string(),
  status: z.enum(['todo', 'awaiting_approval', 'open', 'in_review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  parentTask: z.string().optional(),
  rootOnly: z.coerce.boolean().default(false),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
})

/**
 * @group Tasks
 * @description List tasks in a project
 * @authenticated
 * @queryParam projectId string required Project ID
 * @queryParam status string optional Filter by status (todo, in_progress, review, done)
 * @queryParam parentTask string optional Filter by parent task ID
 * @queryParam rootOnly boolean optional Only return root tasks (no parent)
 * @queryParam page number optional Page number (default: 1)
 * @queryParam limit number optional Items per page (default: 50, max: 100)
 * @response 200 { "success": true, "data": { "tasks": [...], "total": 0 } }
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const result = querySchema.safeParse(query)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { projectId, status, priority, parentTask, rootOnly, page, limit } = result.data

  // Verify project access
  const project = await Project.findById(projectId)
  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Project not found',
    })
  }

  await requireOrganizationMember(event, project.organization.toString())

  // Build query
  const filter: Record<string, unknown> = { project: projectId }

  if (status) {
    filter.status = status
  }

  if (priority) {
    filter.priority = priority
  }

  if (parentTask) {
    filter.parentTask = parentTask
  } else if (rootOnly) {
    filter.parentTask = null
  }

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort({ order: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Task.countDocuments(filter),
  ])

  // Get subtask counts for each task
  const taskIds = tasks.map((t) => t._id)
  const subtaskCounts = await Task.aggregate([
    { $match: { parentTask: { $in: taskIds } } },
    { $group: { _id: '$parentTask', count: { $sum: 1 } } },
  ])

  const subtaskCountMap = new Map(
    subtaskCounts.map((s) => [s._id.toString(), s.count])
  )

  return {
    success: true,
    data: {
      tasks: tasks.map((t) => ({
        id: t._id,
        taskNumber: t.taskNumber,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee,
        dueDate: t.dueDate,
        parentTask: t.parentTask,
        depth: t.depth,
        order: t.order,
        subtaskCount: subtaskCountMap.get(t._id.toString()) || 0,
        createdBy: t.createdBy,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  }
})
