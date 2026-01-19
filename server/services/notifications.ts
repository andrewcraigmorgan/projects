import type { TaskDocument } from '../models/Task'
import type { CommentDocument } from '../models/Comment'
import { User } from '../models/User'
import { Project } from '../models/Project'
import { TaskSubscription } from '../models/TaskSubscription'
import { sendTaskNotification, type TaskNotificationData } from '../utils/email'

const APP_URL = process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'

export interface TaskChange {
  field: string
  oldValue?: string
  newValue?: string
}

/**
 * Get the task URL for the notification.
 */
function getTaskUrl(projectId: string, taskId: string): string {
  return `${APP_URL}/projects/${projectId}/tasks/${taskId}`
}

/**
 * Get all user IDs who should be notified about a task update.
 * Includes: task creator, assignee, and all subscribers.
 * Excludes: the user who triggered the update.
 */
async function getNotifyUserIds(task: TaskDocument, excludeUserId: string): Promise<Set<string>> {
  const notifyUserIds = new Set<string>()

  // Add task creator
  if (task.createdBy && task.createdBy.toString() !== excludeUserId) {
    notifyUserIds.add(task.createdBy.toString())
  }

  // Add assignee
  if (task.assignee && task.assignee.toString() !== excludeUserId) {
    notifyUserIds.add(task.assignee.toString())
  }

  // Add all subscribers
  const subscriptions = await TaskSubscription.find({ task: task._id })
  for (const sub of subscriptions) {
    const subUserId = sub.user.toString()
    if (subUserId !== excludeUserId) {
      notifyUserIds.add(subUserId)
    }
  }

  return notifyUserIds
}

/**
 * Send notification when a task is created.
 */
export async function notifyTaskCreated(
  task: TaskDocument,
  creatorId: string
): Promise<void> {
  const [creator, project] = await Promise.all([
    User.findById(creatorId),
    Project.findById(task.project),
  ])

  if (!creator || !project) return

  // Notify assignee if different from creator
  if (task.assignee && task.assignee.toString() !== creatorId) {
    const assignee = await User.findById(task.assignee)
    if (assignee) {
      const data: TaskNotificationData = {
        taskId: task._id.toString(),
        taskTitle: task.title,
        taskDescription: task.description,
        projectName: project.name,
        updateType: 'created',
        updatedBy: {
          name: creator.name,
          email: creator.email,
        },
        taskUrl: getTaskUrl(project._id.toString(), task._id.toString()),
      }

      try {
        await sendTaskNotification(assignee.email, assignee.name, data)
      } catch (error) {
        console.error('[Notifications] Failed to send task created notification:', error)
      }
    }
  }
}

/**
 * Send notification when a task is assigned.
 */
export async function notifyTaskAssigned(
  task: TaskDocument,
  assigneeId: string,
  assignerId: string
): Promise<void> {
  // Don't notify if self-assigning
  if (assigneeId === assignerId) return

  const [assignee, assigner, project] = await Promise.all([
    User.findById(assigneeId),
    User.findById(assignerId),
    Project.findById(task.project),
  ])

  if (!assignee || !assigner || !project) return

  const data: TaskNotificationData = {
    taskId: task._id.toString(),
    taskTitle: task.title,
    taskDescription: task.description,
    projectName: project.name,
    updateType: 'assigned',
    updatedBy: {
      name: assigner.name,
      email: assigner.email,
    },
    taskUrl: getTaskUrl(project._id.toString(), task._id.toString()),
  }

  try {
    await sendTaskNotification(assignee.email, assignee.name, data)
  } catch (error) {
    console.error('[Notifications] Failed to send task assigned notification:', error)
  }
}

/**
 * Send notification when a task status changes.
 */
export async function notifyTaskStatusChanged(
  task: TaskDocument,
  oldStatus: string,
  newStatus: string,
  updaterId: string
): Promise<void> {
  const [updater, project, notifyUserIds] = await Promise.all([
    User.findById(updaterId),
    Project.findById(task.project),
    getNotifyUserIds(task, updaterId),
  ])

  if (!updater || !project) return

  for (const userId of notifyUserIds) {
    const user = await User.findById(userId)
    if (!user) continue

    const data: TaskNotificationData = {
      taskId: task._id.toString(),
      taskTitle: task.title,
      projectName: project.name,
      updateType: 'status_changed',
      updatedBy: {
        name: updater.name,
        email: updater.email,
      },
      changes: [
        {
          field: 'Status',
          oldValue: oldStatus,
          newValue: newStatus,
        },
      ],
      taskUrl: getTaskUrl(project._id.toString(), task._id.toString()),
    }

    try {
      await sendTaskNotification(user.email, user.name, data)
    } catch (error) {
      console.error('[Notifications] Failed to send status change notification:', error)
    }
  }
}

/**
 * Send notification when a task is updated with multiple changes.
 */
export async function notifyTaskUpdated(
  task: TaskDocument,
  changes: TaskChange[],
  updaterId: string
): Promise<void> {
  if (changes.length === 0) return

  const [updater, project, notifyUserIds] = await Promise.all([
    User.findById(updaterId),
    Project.findById(task.project),
    getNotifyUserIds(task, updaterId),
  ])

  if (!updater || !project) return

  for (const userId of notifyUserIds) {
    const user = await User.findById(userId)
    if (!user) continue

    const data: TaskNotificationData = {
      taskId: task._id.toString(),
      taskTitle: task.title,
      projectName: project.name,
      updateType: 'updated',
      updatedBy: {
        name: updater.name,
        email: updater.email,
      },
      changes,
      taskUrl: getTaskUrl(project._id.toString(), task._id.toString()),
    }

    try {
      await sendTaskNotification(user.email, user.name, data)
    } catch (error) {
      console.error('[Notifications] Failed to send task update notification:', error)
    }
  }
}

/**
 * Send notification when a comment is added to a task.
 */
export async function notifyCommentAdded(
  task: TaskDocument,
  comment: CommentDocument,
  commenterId: string | null
): Promise<void> {
  const [project, notifyUserIds] = await Promise.all([
    Project.findById(task.project),
    getNotifyUserIds(task, commenterId || ''),
  ])

  if (!project) return

  // Get commenter info
  let commenterName = comment.authorName || 'Someone'
  let commenterEmail = comment.authorEmail || ''

  if (commenterId) {
    const commenter = await User.findById(commenterId)
    if (commenter) {
      commenterName = commenter.name
      commenterEmail = commenter.email
    }
  }

  for (const userId of notifyUserIds) {
    const user = await User.findById(userId)
    if (!user) continue

    // Don't notify if the user is the one who commented via email
    if (comment.source === 'email' && user.email.toLowerCase() === comment.authorEmail?.toLowerCase()) {
      continue
    }

    const data: TaskNotificationData = {
      taskId: task._id.toString(),
      taskTitle: task.title,
      projectName: project.name,
      updateType: 'commented',
      updatedBy: {
        name: commenterName,
        email: commenterEmail,
      },
      comment: {
        authorName: commenterName,
        content: comment.content,
      },
      taskUrl: getTaskUrl(project._id.toString(), task._id.toString()),
    }

    try {
      await sendTaskNotification(user.email, user.name, data)
    } catch (error) {
      console.error('[Notifications] Failed to send comment notification:', error)
    }
  }
}
