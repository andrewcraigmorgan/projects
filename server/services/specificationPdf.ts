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

    // Summary info
    const totalMilestones = specification.milestones.length
    let totalItems = specification.milestones.reduce((sum, m) => sum + m.taskStats.total, 0)
    if (specification.unassignedTasks) {
      totalItems += specification.unassignedTasks.taskStats.total
    }
    doc.moveDown(1)
    doc.text(`${totalMilestones} Milestones | ${totalItems} Items`, { align: 'center' })

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
      const approvalLabel = milestone.signoffStatus.status === 'complete' ? ' [Approved]' :
                            milestone.signoffStatus.status === 'partial' ? ` [${milestone.signoffStatus.signedCount}/${milestone.signoffStatus.totalApprovers} Signed]` : ''
      doc.fontSize(12)
        .fillColor(textColor)
        .text(`${index + 1}. ${milestone.name}${approvalLabel}`, 70, tocY)
      tocY += 25
    })

    if (specification.unassignedTasks) {
      doc.fontSize(12)
        .fillColor(textColor)
        .text(`${specification.milestones.length + 1}. Additional Items`, 70, tocY)
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
        .text('Additional Items')
      doc.moveDown()

      doc.fontSize(10)
        .fillColor(grayColor)
        .text('Items not yet assigned to a milestone phase')
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

  // Approval indicator
  if (milestone.isLocked) {
    doc.fontSize(10)
      .fillColor(successColor)
      .text('✓ Approved')
  }

  doc.moveDown(0.5)

  // Milestone description
  doc.fontSize(10)
    .fillColor(grayColor)

  if (milestone.description) {
    // Strip HTML tags for PDF
    const plainDesc = milestone.description.replace(/<[^>]*>/g, '')
    doc.fillColor(textColor)
      .text(plainDesc)
    doc.moveDown(0.3)
  }

  // Date range
  const dateRange = []
  if (milestone.startDate) dateRange.push(`Start: ${new Date(milestone.startDate).toLocaleDateString()}`)
  if (milestone.endDate) dateRange.push(`End: ${new Date(milestone.endDate).toLocaleDateString()}`)
  if (dateRange.length > 0) {
    doc.fillColor(grayColor)
      .text(dateRange.join(' | '))
  }

  // Approval status
  doc.moveDown(0.5)
  const signoffColor = milestone.signoffStatus.status === 'complete' ? successColor :
                       milestone.signoffStatus.status === 'partial' ? warningColor : grayColor
  const signoffLabel = milestone.signoffStatus.status === 'complete' ? 'Fully Approved' :
                       milestone.signoffStatus.status === 'partial' ? `${milestone.signoffStatus.signedCount}/${milestone.signoffStatus.totalApprovers} Signed` : 'Pending Approval'
  doc.fillColor(signoffColor)
    .text(`Approval Status: ${signoffLabel}`)

  // List signoffs
  if (milestone.signoffStatus.signoffs.length > 0) {
    doc.fontSize(9)
      .fillColor(grayColor)
    milestone.signoffStatus.signoffs.forEach(s => {
      doc.text(`  Signed by ${s.signedBy.name} on ${new Date(s.signedAt).toLocaleString()}${s.notes ? `: "${s.notes}"` : ''}`)
    })
  }

  doc.moveDown()

  // Horizontal line
  doc.moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor(lightGray)
    .stroke()
  doc.moveDown()

  // Tasks / Scope Items
  if (milestone.tasks.length > 0) {
    doc.fontSize(12)
      .fillColor(textColor)
      .text('Scope Items')
    doc.moveDown(0.5)

    renderTaskList(doc, milestone.tasks, 0, { textColor, grayColor, lightGray })
  } else {
    doc.fontSize(10)
      .fillColor(grayColor)
      .text('No items defined for this milestone')
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

    // Task number bullet and title
    doc.fontSize(11)
      .fillColor(textColor)
      .text(`${task.taskNumber}. ${task.title}`, indent, doc.y, { width: 545 - indent })

    // Priority indicator (scope-relevant, not status)
    if (task.priority && task.priority !== 'medium') {
      const priorityLabel = task.priority === 'urgent' ? 'Urgent Priority' :
                           task.priority === 'high' ? 'High Priority' :
                           task.priority === 'low' ? 'Low Priority' : ''
      if (priorityLabel) {
        doc.fontSize(9)
          .fillColor(task.priority === 'urgent' || task.priority === 'high' ? '#dc2626' : grayColor)
          .text(priorityLabel, indent + 20, doc.y, { width: 545 - indent - 20 })
      }
    }

    // Description (the main content for specification)
    if (task.description) {
      // Strip HTML tags for PDF
      const plainDesc = task.description.replace(/<[^>]*>/g, '')
      if (plainDesc.trim()) {
        doc.fontSize(10)
          .fillColor(grayColor)
          .text(plainDesc, indent + 20, doc.y, { width: 545 - indent - 20 })
      }
    } else {
      doc.fontSize(9)
        .fillColor(grayColor)
        .text('No description provided.', indent + 20, doc.y, { width: 545 - indent - 20 })
    }

    doc.moveDown(0.5)

    // Render subtasks recursively
    if (task.subtasks && task.subtasks.length > 0) {
      renderTaskList(doc, task.subtasks, depth + 1, colors)
    }
  })
}
