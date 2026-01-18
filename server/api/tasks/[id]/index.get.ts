import { Task } from '../../../models/Task'
import { Project } from '../../../models/Project'
import { requireOrganizationMember } from '../../../utils/tenant'

/**
 * @group Tasks
 * @description Get task details with optional subtask tree
 * @authenticated
 * @urlParam id string required Task ID
 * @queryParam includeSubtasks boolean optional Include all subtasks recursively
 * @response 200 { "success": true, "data": { "task": {...} } }
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

  const query = getQuery(event)
  const includeSubtasks = query.includeSubtasks === 'true'

  const task = await Task.findById(id)
    .populate('assignee', 'name email avatar')
    .populate('createdBy', 'name email avatar')

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

  // Get subtask count
  const subtaskCount = await Task.countDocuments({ parentTask: id })

  const taskData: Record<string, unknown> = {
    id: task._id,
    project: task.project,
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
    subtaskCount,
    createdBy: task.createdBy,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }

  // Include full subtask tree if requested
  if (includeSubtasks) {
    const subtasks = await getSubtaskTree(id)
    taskData.subtasks = subtasks
  }

  return {
    success: true,
    data: {
      task: taskData,
    },
  }
})

// Recursive function to build subtask tree
async function getSubtaskTree(parentId: string): Promise<unknown[]> {
  const subtasks = await Task.find({ parentTask: parentId })
    .populate('assignee', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .sort({ order: 1 })

  const result = []
  for (const subtask of subtasks) {
    const children = await getSubtaskTree(subtask._id.toString())
    result.push({
      id: subtask._id,
      title: subtask.title,
      description: subtask.description,
      status: subtask.status,
      priority: subtask.priority,
      assignee: subtask.assignee,
      dueDate: subtask.dueDate,
      depth: subtask.depth,
      order: subtask.order,
      createdBy: subtask.createdBy,
      createdAt: subtask.createdAt,
      updatedAt: subtask.updatedAt,
      subtasks: children,
    })
  }

  return result
}
