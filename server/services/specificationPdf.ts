import PDFDocument from 'pdfkit'

interface TaskData {
  taskNumber: number
  title: string
  description: string
  status: string
  priority: string
  assignees: Array<{ name: string }>
  dueDate: string | null
  subtasks: TaskData[]
}

interface SignoffData {
  signedBy: { name: string; email: string }
  signedAt: string
  notes: string
}

interface MilestoneData {
  name: string
  description: string
  startDate: string | null
  endDate: string | null
  status: string
  isLocked: boolean
  signoffStatus: {
    status: string
    totalApprovers: number
    signedCount: number
    signoffs: SignoffData[]
  }
  tasks: TaskData[]
  taskStats: { total: number; completed: number }
}

interface SpecificationData {
  project: {
    name: string
    code: string
    description: string
    owner: { name: string }
  }
  generatedAt: string
  approvers: Array<{
    user: { name: string; email: string }
  }>
  milestones: MilestoneData[]
  unassignedTasks: {
    tasks: TaskData[]
    taskStats: { total: number; completed: number }
  } | null
}

export function generateSpecificationPdf(specification: SpecificationData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `${specification.project.name} - Project Specification`,
        Author: 'Project Management System',
      },
    })

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Colors
    const primaryColor = '#6366f1'
    const textColor = '#1f2937'
    const grayColor = '#6b7280'
    const lightGray = '#e5e7eb'
    const successColor = '#10b981'
    const warningColor = '#f59e0b'

    // Cover Page
    doc.fontSize(32)
      .fillColor(primaryColor)
      .text(specification.project.name, { align: 'center' })

    doc.moveDown(0.5)
    doc.fontSize(14)
      .fillColor(grayColor)
      .text(`Project Code: ${specification.project.code}`, { align: 'center' })

    doc.moveDown(2)
    doc.fontSize(24)
      .fillColor(textColor)
      .text('Project Specification', { align: 'center' })

    doc.moveDown(4)
    if (specification.project.description) {
      doc.fontSize(12)
        .fillColor(textColor)
        .text(specification.project.description, { align: 'center' })
    }

    doc.moveDown(4)
    doc.fontSize(10)
      .fillColor(grayColor)
      .text(`Generated: ${new Date(specification.generatedAt).toLocaleString()}`, { align: 'center' })
    doc.text(`Project Owner: ${specification.project.owner.name}`, { align: 'center' })

    // Approvers section on cover
    if (specification.approvers.length > 0) {
      doc.moveDown(2)
      doc.fontSize(12)
        .fillColor(textColor)
        .text('Designated Approvers:', { align: 'center' })
      doc.fontSize(10)
        .fillColor(grayColor)
      specification.approvers.forEach(a => {
        doc.text(`${a.user.name} (${a.user.email})`, { align: 'center' })
      })
    }

    // Table of Contents
    doc.addPage()
    doc.fontSize(20)
      .fillColor(primaryColor)
      .text('Table of Contents')
    doc.moveDown()

    let tocY = doc.y
    specification.milestones.forEach((milestone, index) => {
      const signoffIcon = milestone.signoffStatus.status === 'complete' ? '[SIGNED]' :
                          milestone.signoffStatus.status === 'partial' ? '[PARTIAL]' : ''
      doc.fontSize(12)
        .fillColor(textColor)
        .text(`${index + 1}. ${milestone.name} ${signoffIcon}`, 70, tocY)
      doc.fontSize(10)
        .fillColor(grayColor)
        .text(`${milestone.taskStats.completed}/${milestone.taskStats.total} tasks completed`, 90, tocY + 15)
      tocY += 35
    })

    if (specification.unassignedTasks) {
      doc.fontSize(12)
        .fillColor(textColor)
        .text(`${specification.milestones.length + 1}. Unassigned Tasks`, 70, tocY)
      doc.fontSize(10)
        .fillColor(grayColor)
        .text(`${specification.unassignedTasks.taskStats.completed}/${specification.unassignedTasks.taskStats.total} tasks`, 90, tocY + 15)
    }

    // Milestone Sections
    specification.milestones.forEach((milestone, index) => {
      doc.addPage()
      renderMilestoneSection(doc, milestone, index + 1, {
        primaryColor,
        textColor,
        grayColor,
        lightGray,
        successColor,
        warningColor,
      })
    })

    // Unassigned Tasks Section
    if (specification.unassignedTasks && specification.unassignedTasks.tasks.length > 0) {
      doc.addPage()
      doc.fontSize(18)
        .fillColor(primaryColor)
        .text('Unassigned Tasks')
      doc.moveDown()

      doc.fontSize(10)
        .fillColor(grayColor)
        .text(`${specification.unassignedTasks.taskStats.completed} of ${specification.unassignedTasks.taskStats.total} tasks completed`)
      doc.moveDown()

      renderTaskList(doc, specification.unassignedTasks.tasks, 0, { textColor, grayColor, lightGray })
    }

    doc.end()
  })
}

function renderMilestoneSection(
  doc: PDFKit.PDFDocument,
  milestone: MilestoneData,
  sectionNumber: number,
  colors: Record<string, string>
) {
  const { primaryColor, textColor, grayColor, lightGray, successColor, warningColor } = colors

  // Milestone Header
  doc.fontSize(18)
    .fillColor(primaryColor)
    .text(`${sectionNumber}. ${milestone.name}`)

  // Lock indicator
  if (milestone.isLocked) {
    doc.fontSize(10)
      .fillColor(successColor)
      .text('[LOCKED - Signed Off]')
  }

  doc.moveDown(0.5)

  // Milestone meta
  doc.fontSize(10)
    .fillColor(grayColor)

  if (milestone.description) {
    doc.text(milestone.description)
    doc.moveDown(0.3)
  }

  const dateRange = []
  if (milestone.startDate) dateRange.push(`Start: ${new Date(milestone.startDate).toLocaleDateString()}`)
  if (milestone.endDate) dateRange.push(`End: ${new Date(milestone.endDate).toLocaleDateString()}`)
  if (dateRange.length > 0) {
    doc.text(dateRange.join(' | '))
  }

  doc.text(`Status: ${milestone.status} | ${milestone.taskStats.completed}/${milestone.taskStats.total} tasks completed`)

  // Sign-off status
  doc.moveDown(0.5)
  const signoffColor = milestone.signoffStatus.status === 'complete' ? successColor :
                       milestone.signoffStatus.status === 'partial' ? warningColor : grayColor
  doc.fillColor(signoffColor)
    .text(`Sign-off: ${milestone.signoffStatus.signedCount}/${milestone.signoffStatus.totalApprovers} approvers signed`)

  // List signoffs
  if (milestone.signoffStatus.signoffs.length > 0) {
    doc.fontSize(9)
      .fillColor(grayColor)
    milestone.signoffStatus.signoffs.forEach(s => {
      doc.text(`  - ${s.signedBy.name} signed on ${new Date(s.signedAt).toLocaleString()}${s.notes ? `: "${s.notes}"` : ''}`)
    })
  }

  doc.moveDown()

  // Horizontal line
  doc.moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor(lightGray)
    .stroke()
  doc.moveDown()

  // Tasks
  if (milestone.tasks.length > 0) {
    doc.fontSize(12)
      .fillColor(textColor)
      .text('Tasks')
    doc.moveDown(0.5)

    renderTaskList(doc, milestone.tasks, 0, { textColor, grayColor, lightGray })
  } else {
    doc.fontSize(10)
      .fillColor(grayColor)
      .text('No tasks in this milestone')
  }
}

function renderTaskList(
  doc: PDFKit.PDFDocument,
  tasks: TaskData[],
  depth: number,
  colors: { textColor: string; grayColor: string; lightGray: string }
) {
  const { textColor, grayColor } = colors
  const indent = 50 + (depth * 20)

  tasks.forEach(task => {
    // Check if we need a new page
    if (doc.y > 700) {
      doc.addPage()
    }

    // Task number and title
    const statusIcon = task.status === 'done' ? '[x]' : '[ ]'
    doc.fontSize(11)
      .fillColor(textColor)
      .text(`${statusIcon} #${task.taskNumber}: ${task.title}`, indent, doc.y, { width: 545 - indent })

    // Task meta line
    const metaParts = []
    metaParts.push(`Status: ${task.status}`)
    if (task.priority) metaParts.push(`Priority: ${task.priority}`)
    if (task.assignees && task.assignees.length > 0) {
      metaParts.push(`Assigned: ${task.assignees.map(a => a.name).join(', ')}`)
    }
    if (task.dueDate) {
      metaParts.push(`Due: ${new Date(task.dueDate).toLocaleDateString()}`)
    }

    doc.fontSize(9)
      .fillColor(grayColor)
      .text(metaParts.join(' | '), indent + 20, doc.y, { width: 545 - indent - 20 })

    // Description (truncated)
    if (task.description) {
      const desc = task.description.length > 200
        ? task.description.substring(0, 200) + '...'
        : task.description
      // Strip HTML tags
      const plainDesc = desc.replace(/<[^>]*>/g, '')
      if (plainDesc.trim()) {
        doc.fontSize(9)
          .fillColor(grayColor)
          .text(plainDesc, indent + 20, doc.y, { width: 545 - indent - 20 })
      }
    }

    doc.moveDown(0.5)

    // Render subtasks recursively
    if (task.subtasks && task.subtasks.length > 0) {
      renderTaskList(doc, task.subtasks, depth + 1, colors)
    }
  })
}
