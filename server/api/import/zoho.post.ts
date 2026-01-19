import { z } from 'zod'
import { Project } from '../../models/Project'
import { Task } from '../../models/Task'
import { User } from '../../models/User'
import { Organization } from '../../models/Organization'
import { Milestone } from '../../models/Milestone'
import { Tag } from '../../models/Tag'

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
      status: z.string().optional().nullable(),
      priority: z.string().optional().nullable(),
      dueDate: z.string().nullable().optional(),
      assigneeName: z.string().nullable().optional(),
      projectName: z.string(),
      parentTaskTitle: z.string().nullable().optional(),
      milestoneName: z.string().nullable().optional(),
      tags: z.array(z.string()).optional(),
      estimatedHours: z.number().nullable().optional(),
      percentComplete: z.number().nullable().optional(),
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
    milestones: { created: 0, errors: [] as string[] },
    tags: { created: 0, errors: [] as string[] },
  }

  // Create a map to track projects by name
  const projectMap = new Map<string, any>()

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
        const projectData = projects.find((p) => p.name === projectName)
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
      results.projects.errors.push(
        `Failed to create project "${projectName}": ${e instanceof Error ? e.message : 'Unknown error'}`
      )
    }
  }

  // Get all org members for name-based lookup
  const orgMembers = await User.find({
    _id: { $in: organization.members.map((m: any) => m.user) },
  })

  // Build user lookup maps (by name and email)
  const userByName = new Map<string, any>()
  const userByEmail = new Map<string, any>()
  for (const u of orgMembers) {
    userByName.set(u.name?.toLowerCase() || '', u)
    userByEmail.set(u.email?.toLowerCase() || '', u)
  }

  // Find assignee by name (handles multiple names like "Andrew Morgan, Matthew Martin")
  function findAssignee(assigneeName: string | null | undefined): any | null {
    if (!assigneeName) return null

    // Try to split multiple names and use the first one
    const names = assigneeName.split(',').map((n) => n.trim())
    for (const name of names) {
      const nameLower = name.toLowerCase()

      // Try exact name match first
      const byName = userByName.get(nameLower)
      if (byName) return byName

      // Try email match
      const byEmail = userByEmail.get(nameLower)
      if (byEmail) return byEmail

      // Try partial name match (first name or last name)
      for (const [key, u] of userByName.entries()) {
        if (key && (key.includes(nameLower) || nameLower.includes(key))) {
          return u
        }
      }
    }
    return null
  }

  // Collect unique milestone names per project
  const milestoneNamesByProject = new Map<string, Set<string>>()
  for (const t of tasks) {
    if (t.milestoneName && t.milestoneName !== 'None') {
      const set = milestoneNamesByProject.get(t.projectName) || new Set()
      set.add(t.milestoneName)
      milestoneNamesByProject.set(t.projectName, set)
    }
  }

  // Create milestones
  const milestoneMap = new Map<string, any>() // key: projectName::milestoneName
  for (const [projectName, milestoneNames] of milestoneNamesByProject) {
    const project = projectMap.get(projectName)
    if (!project) continue

    for (const milestoneName of milestoneNames) {
      try {
        // Check if milestone exists
        let milestone = await Milestone.findOne({
          project: project._id,
          name: milestoneName,
        })

        if (!milestone) {
          milestone = await Milestone.create({
            project: project._id,
            name: milestoneName,
            status: 'active',
          })
          results.milestones.created++
        }

        milestoneMap.set(`${projectName}::${milestoneName}`, milestone)
      } catch (e) {
        results.milestones.errors.push(
          `Failed to create milestone "${milestoneName}": ${e instanceof Error ? e.message : 'Unknown error'}`
        )
      }
    }
  }

  // Collect unique tag names per project
  const tagNamesByProject = new Map<string, Set<string>>()
  for (const t of tasks) {
    if (t.tags && t.tags.length > 0) {
      const set = tagNamesByProject.get(t.projectName) || new Set()
      for (const tagName of t.tags) {
        set.add(tagName)
      }
      tagNamesByProject.set(t.projectName, set)
    }
  }

  // Create tags
  const tagMap = new Map<string, any>() // key: projectName::tagName
  for (const [projectName, tagNames] of tagNamesByProject) {
    const project = projectMap.get(projectName)
    if (!project) continue

    for (const tagName of tagNames) {
      try {
        // Check if tag exists
        let tag = await Tag.findOne({
          project: project._id,
          name: tagName,
        })

        if (!tag) {
          tag = await Tag.create({
            project: project._id,
            name: tagName,
          })
          results.tags.created++
        }

        tagMap.set(`${projectName}::${tagName}`, tag)
      } catch (e) {
        results.tags.errors.push(
          `Failed to create tag "${tagName}": ${e instanceof Error ? e.message : 'Unknown error'}`
        )
      }
    }
  }

  // Track task numbers per project
  const taskNumberCounters = new Map<string, number>()
  for (const project of projectMap.values()) {
    // Get the highest existing task number for this project
    const lastTask = await Task.findOne({ project: project._id })
      .sort({ taskNumber: -1 })
      .select('taskNumber')
    taskNumberCounters.set(
      project._id.toString(),
      lastTask?.taskNumber || 0
    )
  }

  // Track created tasks for parent task lookups
  const taskMap = new Map<string, any>() // key: projectName::title

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
        results.tasks.errors.push(
          `Project not found for task "${taskData.title}"`
        )
        continue
      }

      // Find assignee by name
      const assignee = findAssignee(taskData.assigneeName)

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

      // Find milestone
      let milestone = null
      if (taskData.milestoneName && taskData.milestoneName !== 'None') {
        milestone = milestoneMap.get(
          `${taskData.projectName}::${taskData.milestoneName}`
        )
      }

      // Find tags
      const taskTags: any[] = []
      if (taskData.tags && taskData.tags.length > 0) {
        for (const tagName of taskData.tags) {
          const tag = tagMap.get(`${taskData.projectName}::${tagName}`)
          if (tag) {
            taskTags.push(tag._id)
          }
        }
      }

      // Determine status - use value from client or default
      const status = taskData.status || 'todo'

      // Check if task already exists
      const existingTask = await Task.findOne({
        project: project._id,
        title: taskData.title,
      })

      if (existingTask) {
        taskMap.set(`${taskData.projectName}::${taskData.title}`, existingTask)
        continue // Skip duplicates
      }

      // Increment task number
      const projectId = project._id.toString()
      const nextTaskNumber = (taskNumberCounters.get(projectId) || 0) + 1
      taskNumberCounters.set(projectId, nextTaskNumber)

      const task = await Task.create({
        project: project._id,
        taskNumber: nextTaskNumber,
        title: taskData.title,
        description: taskData.description || '',
        status,
        priority: taskData.priority || undefined,
        dueDate,
        estimatedHours: taskData.estimatedHours || undefined,
        assignee: assignee?._id || null,
        parentTask: parentTask?._id || null,
        milestone: milestone?._id || null,
        tags: taskTags.length > 0 ? taskTags : undefined,
        createdBy: user._id,
      })

      taskMap.set(`${taskData.projectName}::${taskData.title}`, task)
      results.tasks.created++
    } catch (e) {
      results.tasks.errors.push(
        `Failed to create task "${taskData.title}": ${e instanceof Error ? e.message : 'Unknown error'}`
      )
    }
  }

  return {
    success: true,
    data: results,
  }
})
