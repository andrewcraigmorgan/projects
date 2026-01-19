import { z } from 'zod'
import { Task } from '../../models/Task'
import { Project } from '../../models/Project'
import { requireOrganizationMember } from '../../utils/tenant'

const createTaskSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(500),
  description: z.string().max(10000).default(''),
  status: z.enum(['todo', 'awaiting_approval', 'open', 'in_review', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assignee: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  parentTask: z.string().optional(),
})

/**
 * @group Tasks
 * @description Create a new task or subtask
 * @authenticated
 * @bodyParam projectId string required Project ID
 * @bodyParam title string required Task title
 * @bodyParam description string optional Task description
 * @bodyParam status string optional Task status (default: todo)
 * @bodyParam priority string optional Task priority (default: medium)
 * @bodyParam assignee string optional User ID to assign
 * @bodyParam dueDate string optional Due date (ISO 8601)
 * @bodyParam parentTask string optional Parent task ID for creating subtasks
 * @response 201 { "success": true, "data": { "task": {...} } }
 * @response 400 { "success": false, "error": "Validation error" }
 */
export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const body = await readBody(event)
  const result = createTaskSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { projectId, parentTask, dueDate, ...taskData } = result.data

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

  // If parent task specified, verify it exists and belongs to same project
  if (parentTask) {
    const parent = await Task.findById(parentTask)
    if (!parent) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Parent task not found',
      })
    }
    if (parent.project.toString() !== projectId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Parent task must belong to the same project',
      })
    }
  }

  // Get max order for positioning
  const maxOrderTask = await Task.findOne({
    project: projectId,
    parentTask: parentTask || null,
  }).sort({ order: -1 })

  const order = maxOrderTask ? maxOrderTask.order + 1 : 0

  // Create task
  const task = await Task.create({
    project: projectId,
    ...taskData,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    parentTask: parentTask || null,
    order,
    createdBy: auth.userId,
  })

  await task.populate('assignee', 'name email avatar')
  await task.populate('createdBy', 'name email avatar')

  setResponseStatus(event, 201)
  return {
    success: true,
    data: {
      task: {
        id: task._id,
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
        subtaskCount: 0,
        createdBy: task.createdBy,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      },
    },
  }
})
