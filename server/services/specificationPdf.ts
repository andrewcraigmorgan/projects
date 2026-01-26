import PDFDocument from 'pdfkit'

// Decode HTML entities and strip HTML tags
function stripHtmlAndDecode(text: string): string {
  if (!text) return ''
  return text
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

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

// Typography settings based on depth
function getTypographyForDepth(depth: number): { fontSize: number; titleColor: string; isBold: boolean } {
  switch (depth) {
    case 0:
      return { fontSize: 16, titleColor: '#111827', isBold: true }
    case 1:
      return { fontSize: 14, titleColor: '#1f2937', isBold: true }
    case 2:
      return { fontSize: 12, titleColor: '#374151', isBold: false }
    default:
      return { fontSize: 11, titleColor: '#4b5563', isBold: false }
  }
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
    doc.fontSize(36)
      .fillColor(primaryColor)
      .text(specification.project.name, { align: 'center' })

    doc.moveDown(0.5)
    doc.fontSize(16)
      .fillColor(grayColor)
      .text(`Project Code: ${specification.project.code}`, { align: 'center' })

    doc.moveDown(2)
    doc.fontSize(28)
      .fillColor(textColor)
      .text('Project Specification', { align: 'center' })

    doc.moveDown(4)
    if (specification.project.description) {
      doc.fontSize(14)
        .fillColor(textColor)
        .text(specification.project.description, { align: 'center' })
    }

    doc.moveDown(4)
    doc.fontSize(12)
      .fillColor(grayColor)
      .text(`Generated: ${new Date(specification.generatedAt).toLocaleString()}`, { align: 'center' })
    doc.text(`Project Owner: ${specification.project.owner.name}`, { align: 'center' })

    // Approvers section on cover
    if (specification.approvers.length > 0) {
      doc.moveDown(2)
      doc.fontSize(14)
        .fillColor(textColor)
        .text('Designated Approvers:', { align: 'center' })
      doc.fontSize(12)
        .fillColor(grayColor)
      specification.approvers.forEach(a => {
        doc.text(`${a.user.name} (${a.user.email})`, { align: 'center' })
      })
    }

    // Table of Contents
    doc.addPage()
    doc.fontSize(24)
      .fillColor(primaryColor)
      .text('Table of Contents')
    doc.moveDown(1.5)

    let tocY = doc.y
    specification.milestones.forEach((milestone, index) => {
      const approvalLabel = milestone.signoffStatus.status === 'complete' ? ' [Approved]' :
                            milestone.signoffStatus.status === 'partial' ? ` [${milestone.signoffStatus.signedCount}/${milestone.signoffStatus.totalApprovers} Signed]` : ''
      doc.fontSize(14)
        .fillColor(textColor)
        .text(`${index + 1}. ${milestone.name}${approvalLabel}`, 70, tocY)
      tocY += 30
    })

    if (specification.unassignedTasks) {
      doc.fontSize(14)
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function renderMilestoneSection(
  doc: PDFKit.PDFDocument,
  milestone: MilestoneData,
  sectionNumber: number,
  colors: Record<string, string>
) {
  const { primaryColor, textColor, grayColor, lightGray, successColor, warningColor } = colors
  const pageWidth = 545
  const leftMargin = 50

  // Milestone Header with dates in top right
  const headerY = doc.y

  // Title on left
  doc.fontSize(22)
    .fillColor(primaryColor)
    .text(`${sectionNumber}. ${milestone.name}`, leftMargin, headerY, { width: 350 })

  // Dates on right
  if (milestone.startDate || milestone.endDate) {
    const dateY = headerY
    doc.fontSize(11)
      .fillColor(grayColor)
    if (milestone.startDate) {
      doc.text(`Start: ${formatDate(milestone.startDate)}`, leftMargin, dateY, { width: pageWidth - leftMargin, align: 'right' })
    }
    if (milestone.endDate) {
      doc.text(`End: ${formatDate(milestone.endDate)}`, leftMargin, dateY + 14, { width: pageWidth - leftMargin, align: 'right' })
    }
  }

  doc.moveDown(0.5)

  // Approval indicator
  if (milestone.isLocked) {
    doc.fontSize(12)
      .fillColor(successColor)
      .text('Approved', leftMargin)
  }

  doc.moveDown(0.5)

  // Milestone description
  if (milestone.description) {
    const plainDesc = stripHtmlAndDecode(milestone.description)
    if (plainDesc) {
      doc.fontSize(12)
        .fillColor(textColor)
        .text(plainDesc, leftMargin, doc.y, { width: pageWidth - leftMargin })
      doc.moveDown(0.5)
    }
  }

  // Approval status
  doc.moveDown(0.3)
  const signoffColor = milestone.signoffStatus.status === 'complete' ? successColor :
                       milestone.signoffStatus.status === 'partial' ? warningColor : grayColor
  const signoffLabel = milestone.signoffStatus.status === 'complete' ? 'Fully Approved' :
                       milestone.signoffStatus.status === 'partial' ? `${milestone.signoffStatus.signedCount}/${milestone.signoffStatus.totalApprovers} Signed` : 'Pending Approval'
  doc.fontSize(11)
    .fillColor(signoffColor)
    .text(`Approval Status: ${signoffLabel}`, leftMargin)

  // List signoffs
  if (milestone.signoffStatus.signoffs.length > 0) {
    doc.fontSize(10)
      .fillColor(grayColor)
    milestone.signoffStatus.signoffs.forEach(s => {
      doc.text(`Signed by ${s.signedBy.name} on ${formatDate(s.signedAt)}${s.notes ? `: "${s.notes}"` : ''}`, leftMargin + 10)
    })
  }

  doc.moveDown()

  // Horizontal line
  doc.moveTo(leftMargin, doc.y)
    .lineTo(pageWidth, doc.y)
    .strokeColor(lightGray)
    .stroke()
  doc.moveDown()

  // Tasks / Scope Items
  if (milestone.tasks.length > 0) {
    doc.fontSize(16)
      .font('Helvetica-Bold')
      .fillColor(textColor)
      .text('Scope Items', leftMargin)
    doc.font('Helvetica')
    doc.moveDown(0.5)

    renderTaskList(doc, milestone.tasks, 0, { textColor, grayColor, lightGray })
  } else {
    doc.fontSize(12)
      .fillColor(grayColor)
      .text('No items defined for this milestone', leftMargin)
  }
}

function renderTaskList(
  doc: PDFKit.PDFDocument,
  tasks: TaskData[],
  depth: number,
  colors: { textColor: string; grayColor: string; lightGray: string }
) {
  const { grayColor, lightGray } = colors
  const typography = getTypographyForDepth(depth)
  const leftMargin = 50

  tasks.forEach((task, index) => {
    // Check if we need a new page
    if (doc.y > 700) {
      doc.addPage()
    }

    // Add separator line before top-level items (except first)
    if (depth === 0 && index > 0) {
      doc.moveDown(0.3)
      doc.moveTo(leftMargin, doc.y)
        .lineTo(545, doc.y)
        .strokeColor(lightGray)
        .stroke()
      doc.moveDown(0.5)
    }

    // Task number and title with typography based on depth
    const fontStyle = typography.isBold ? 'Helvetica-Bold' : 'Helvetica'
    const cleanTitle = stripHtmlAndDecode(task.title)
    doc.font(fontStyle)
      .fontSize(typography.fontSize)
      .fillColor(typography.titleColor)
      .text(`${task.taskNumber}. ${cleanTitle}`, leftMargin, doc.y, { width: 495 })

    // Reset to regular font
    doc.font('Helvetica')

    // Description (the main content for specification)
    if (task.description) {
      // Strip HTML tags for PDF
      const plainDesc = task.description.replace(/<[^>]*>/g, '')
      if (plainDesc.trim()) {
        doc.fontSize(11)
          .fillColor(grayColor)
          .text(plainDesc, leftMargin, doc.y, { width: 495 })
      }
    } else {
      doc.fontSize(10)
        .fillColor(grayColor)
        .text('No description provided.', leftMargin, doc.y, { width: 495 })
    }

    doc.moveDown(0.5)

    // Render subtasks recursively
    if (task.subtasks && task.subtasks.length > 0) {
      renderTaskList(doc, task.subtasks, depth + 1, colors)
    }
  })
}
