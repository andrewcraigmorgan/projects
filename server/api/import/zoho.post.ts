import { z } from 'zod'
import { Project } from '~/server/models/Project'
import { Task } from '~/server/models/Task'
import { User } from '~/server/models/User'
import { Organization } from '~/server/models/Organization'

const importSchema = z.object({
  organizationId: z.string(),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      status: z.string().optional(),
    })
  ),
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      dueDate: z.string().nullable().optional(),
      assigneeEmail: z.string().nullable().optional(),
      projectName: z.string(),
      parentTaskTitle: z.string().nullable().optional(),
      taskList: z.string().nullable().optional(),
    })
  ),
})

export default defineEventHandler(async (event) => {
  // Get authenticated user
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const validation = importSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid import data',
      data: validation.error.errors,
    })
  }

  const { organizationId, projects, tasks } = validation.data

  // Verify user has access to organization
  const organization = await Organization.findById(organizationId)
  if (!organization) {
    throw createError({ statusCode: 404, message: 'Organization not found' })
  }

  const isMember = organization.members.some(
    (m: any) => m.user.toString() === user._id.toString()
  )
  if (!isMember) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  const results = {
    projects: { created: 0, errors: [] as string[] },
    tasks: { created: 0, errors: [] as string[] },
  }

  // Create a map to track projects by name
  const projectMap = new Map<string, any>()

  // First, create or find projects
  // Get unique project names from tasks if no projects provided
  const projectNames = new Set<string>()

  if (projects.length > 0) {
    for (const p of projects) {
      if (p.name) projectNames.add(p.name)
    }
  } else {
    for (const t of tasks) {
      if (t.projectName) projectNames.add(t.projectName)
    }
  }

  // Create projects
  for (const projectName of projectNames) {
    try {
      // Check if project already exists
      let project = await Project.findOne({
        organization: organizationId,
        name: projectName,
      })

      if (!project) {
        const projectData = projects.find(p => p.name === projectName)
        project = await Project.create({
          organization: organizationId,
          name: projectName,
          description: projectData?.description || '',
          status: projectData?.status === 'archived' ? 'archived' : 'active',
          owner: user._id,
          members: [user._id],
        })
        results.projects.created++
      }

      projectMap.set(projectName, project)
    } catch (e) {
      results.projects.errors.push(`Failed to create project "${projectName}": ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  // Build a map of users by email for assignee lookup
  const userMap = new Map<string, any>()
  const assigneeEmails = [...new Set(tasks.filter(t => t.assigneeEmail).map(t => t.assigneeEmail!.toLowerCase()))]

  if (assigneeEmails.length > 0) {
    const users = await User.find({ email: { $in: assigneeEmails } })
    for (const u of users) {
      userMap.set(u.email.toLowerCase(), u)
    }
  }

  // Track created tasks for parent task lookups
  const taskMap = new Map<string, any>() // key: projectName + title

  // Sort tasks to process parent tasks first (those without parentTaskTitle)
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.parentTaskTitle && b.parentTaskTitle) return -1
    if (a.parentTaskTitle && !b.parentTaskTitle) return 1
    return 0
  })

  // Create tasks
  for (const taskData of sortedTasks) {
    try {
      if (!taskData.title || !taskData.projectName) {
        results.tasks.errors.push(`Skipped task with missing title or project`)
        continue
      }

      const project = projectMap.get(taskData.projectName)
      if (!project) {
        results.tasks.errors.push(`Project not found for task "${taskData.title}"`)
        continue
      }

      // Find assignee
      let assignee = null
      if (taskData.assigneeEmail) {
        assignee = userMap.get(taskData.assigneeEmail.toLowerCase())
      }

      // Find parent task
      let parentTask = null
      if (taskData.parentTaskTitle) {
        const parentKey = `${taskData.projectName}::${taskData.parentTaskTitle}`
        parentTask = taskMap.get(parentKey)
      }

      // Parse due date
      let dueDate = null
      if (taskData.dueDate) {
        const parsed = new Date(taskData.dueDate)
        if (!isNaN(parsed.getTime())) {
          dueDate = parsed
        }
      }

      // Map status
      let status = 'todo'
      if (taskData.status) {
        const statusLower = taskData.status.toLowerCase()
        if (statusLower.includes('complete') || statusLower.includes('done') || statusLower.includes('closed')) {
          status = 'done'
        } else if (statusLower.includes('progress') || statusLower.includes('active') || statusLower.includes('open')) {
          status = 'in_progress'
        } else if (statusLower.includes('review') || statusLower.includes('pending')) {
          status = 'review'
        }
      }

      // Map priority
      let priority = 'medium'
      if (taskData.priority) {
        const priorityLower = taskData.priority.toLowerCase()
        if (priorityLower.includes('high') || priorityLower.includes('critical')) {
          priority = 'high'
        } else if (priorityLower.includes('low') || priorityLower.includes('none')) {
          priority = 'low'
        } else if (priorityLower.includes('urgent')) {
          priority = 'urgent'
        }
      }

      // Check if task already exists
      const existingTask = await Task.findOne({
        project: project._id,
        title: taskData.title,
      })

      if (existingTask) {
        taskMap.set(`${taskData.projectName}::${taskData.title}`, existingTask)
        continue // Skip duplicates
      }

      const task = await Task.create({
        project: project._id,
        title: taskData.title,
        description: taskData.description || '',
        status,
        priority,
        dueDate,
        assignee: assignee?._id || null,
        parentTask: parentTask?._id || null,
        createdBy: user._id,
      })

      taskMap.set(`${taskData.projectName}::${taskData.title}`, task)
      results.tasks.created++
    } catch (e) {
      results.tasks.errors.push(`Failed to create task "${taskData.title}": ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  return {
    success: true,
    data: results,
  }
})
