import { z } from 'zod'
import { Task } from '../../models/Task'
import { Project } from '../../models/Project'
import { Organization } from '../../models/Organization'
import { requireOrganizationMember } from '../../utils/tenant'

const validStatuses = ['todo', 'awaiting_approval', 'open', 'in_review', 'done'] as const
const validPriorities = ['low', 'medium', 'high'] as const

const querySchema = z.object({
  projectId: z.string().optional(),
  // Natural language search (searches taskNumber, title, description)
  search: z.string().optional().transform((val) => {
    if (!val) return undefined
    return val.trim() || undefined
  }),
  // Accept comma-separated status values for multi-select
  status: z.string().optional().transform((val) => {
    if (!val) return undefined
    const statuses = val.split(',').filter(s => validStatuses.includes(s as typeof validStatuses[number]))
    return statuses.length > 0 ? statuses : undefined
  }),
  // Accept comma-separated priority values for multi-select
  priority: z.string().optional().transform((val) => {
    if (!val) return undefined
    const priorities = val.split(',').filter(p => validPriorities.includes(p as typeof validPriorities[number]))
    return priorities.length > 0 ? priorities : undefined
  }),
  // Accept comma-separated assignee IDs for filtering by assignees
  assignees: z.string().optional().transform((val) => {
    if (!val) return undefined
    const ids = val.split(',').filter(id => id.trim().length > 0)
    return ids.length > 0 ? ids : undefined
  }),
  // Date range filters for due date
  dueDateFrom: z.string().optional(),
  dueDateTo: z.string().optional(),
  // Accept comma-separated milestone IDs for multi-select
  milestone: z.string().optional().transform((val) => {
    if (!val) return undefined
    const ids = val.split(',').filter(id => id.trim().length > 0)
    return ids.length > 0 ? ids : undefined
  }),
  parentTask: z.string().optional(),
  rootOnly: z.coerce.boolean().default(false),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
})

/**
 * @group Tasks
 * @description List tasks. If projectId is provided, lists tasks for that project. Otherwise lists tasks across all accessible projects.
 * @authenticated
 * @queryParam projectId string optional Project ID (if omitted, returns tasks from all accessible projects)
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

  const { projectId, search, status, priority, assignees, dueDateFrom, dueDateTo, milestone, parentTask, rootOnly, page, limit } = result.data

  const auth = event.context.auth
  if (!auth) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  // Build query
  const filter: Record<string, unknown> = {}

  if (projectId) {
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
    filter.project = projectId
  } else {
    // Get all projects the user has access to
    const userOrgs = await Organization.find({ 'members.user': auth.userId }).select('_id')
    const orgIds = userOrgs.map((o) => o._id)

    const accessibleProjects = await Project.find({
      organization: { $in: orgIds },
    }).select('_id')

    filter.project = { $in: accessibleProjects.map((p) => p._id) }
  }

  if (status && status.length > 0) {
    filter.status = status.length === 1 ? status[0] : { $in: status }
  }

  if (priority && priority.length > 0) {
    filter.priority = priority.length === 1 ? priority[0] : { $in: priority }
  }

  if (assignees && assignees.length > 0) {
    filter.assignees = { $in: assignees }
  }

  // Date range filter for due date
  if (dueDateFrom || dueDateTo) {
    filter.dueDate = {}
    if (dueDateFrom) {
      (filter.dueDate as Record<string, Date>).$gte = new Date(dueDateFrom)
    }
    if (dueDateTo) {
      // Add one day to include the end date fully
      const endDate = new Date(dueDateTo)
      endDate.setDate(endDate.getDate() + 1)
      ;(filter.dueDate as Record<string, Date>).$lt = endDate
    }
  }

  if (milestone && milestone.length > 0) {
    filter.milestone = milestone.length === 1 ? milestone[0] : { $in: milestone }
  }

  // Natural language search across taskNumber, title, and description
  if (search) {
    // Escape special regex characters in search term
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Check if search looks like a task number (e.g., "123", "T123", "CODE-T123")
    const taskNumberMatch = search.match(/^(?:[A-Z0-9]+-)?T?(\d+)$/i)
    const searchNumber = taskNumberMatch ? parseInt(taskNumberMatch[1], 10) : null

    // Build $or conditions for search
    const searchConditions: Record<string, unknown>[] = [
      { title: { $regex: escapedSearch, $options: 'i' } },
      { description: { $regex: escapedSearch, $options: 'i' } },
    ]

    // Add taskNumber match if search contains a number
    if (searchNumber !== null) {
      searchConditions.push({ taskNumber: searchNumber })
    }

    filter.$or = searchConditions
  }

  if (parentTask) {
    filter.parentTask = parentTask
  } else if (rootOnly) {
    filter.parentTask = null
  }

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('project', 'name code')
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('milestone', 'name')
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
        assignees: t.assignees,
        dueDate: t.dueDate,
        project: t.project ? { id: (t.project as { _id: unknown })._id, name: (t.project as { name: string }).name, code: (t.project as { code: string }).code } : undefined,
        milestone: t.milestone ? { id: (t.milestone as { _id: unknown })._id, name: (t.milestone as { name: string }).name } : undefined,
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
