import { Task } from '../../../models/Task'
import { Project } from '../../../models/Project'
import { requireOrganizationMember } from '../../../utils/tenant'

/**
 * @group Tasks
 * @description Get task details with optional subtask tree
 * @authenticated
 * @urlParam id string required Task ID
 * @queryParam includeSubtasks boolean optional Include all subtasks recursively
 * @queryParam includeAncestors boolean optional Include ancestor chain for breadcrumb navigation
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
  const includeAncestors = query.includeAncestors === 'true'

  const task = await Task.findById(id)
    .populate('assignee', 'name email avatar role')
    .populate('createdBy', 'name email avatar')
    .populate('milestone', 'name')
    .populate('tags', 'name color')

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
    taskNumber: task.taskNumber,
    project: task.project,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assignee: task.assignee,
    dueDate: task.dueDate,
    estimatedHours: task.estimatedHours,
    isExternal: task.isExternal,
    milestone: task.milestone,
    tags: task.tags,
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

  // Include ancestor chain if requested (for breadcrumb navigation)
  let ancestors: Array<{ id: string; title: string; taskNumber: number }> | undefined
  if (includeAncestors && task.path) {
    ancestors = await getAncestorChain(task.path)
  }

  return {
    success: true,
    data: {
      task: taskData,
      ...(ancestors && { ancestors }),
    },
  }
})

// Get ancestor chain from path for breadcrumb navigation
async function getAncestorChain(path: string): Promise<Array<{ id: string; title: string; taskNumber: number }>> {
  if (!path) return []

  const ancestorIds = path.split('/')
  const ancestors = await Task.find({ _id: { $in: ancestorIds } })
    .select('_id title taskNumber')

  // Sort ancestors according to path order
  const ancestorMap = new Map(ancestors.map(a => [a._id.toString(), a]))
  return ancestorIds
    .map(id => ancestorMap.get(id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map(a => ({
      id: a._id.toString(),
      title: a.title,
      taskNumber: a.taskNumber,
    }))
}

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
      taskNumber: subtask.taskNumber,
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
