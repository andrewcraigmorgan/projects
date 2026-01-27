import mongoose from 'mongoose'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { Task } from '../server/models/Task'
import { Project } from '../server/models/Project'
import { User } from '../server/models/User'
import { Organization } from '../server/models/Organization'
import { Milestone } from '../server/models/Milestone'
import { Attachment } from '../server/models/Attachment'
import { Tag } from '../server/models/Tag'
import { MilestoneSignoff } from '../server/models/MilestoneSignoff'
import { SpecificationApprover } from '../server/models/SpecificationApprover'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/projects'

// Load Zoho credentials from MCP config or environment
interface ZohoConfig {
  accessToken: string
  portalId: string
  apiDomain?: string
  refreshToken?: string
  clientId?: string
  clientSecret?: string
  accountsDomain?: string
}

function loadZohoConfig(): ZohoConfig {
  // Try environment variables first
  if (process.env.ZOHO_ACCESS_TOKEN) {
    return {
      accessToken: process.env.ZOHO_ACCESS_TOKEN,
      portalId: process.env.ZOHO_PORTAL_ID || '860aborede',
      apiDomain: process.env.ZOHO_API_DOMAIN,
      refreshToken: process.env.ZOHO_REFRESH_TOKEN,
      clientId: process.env.ZOHO_CLIENT_ID,
      clientSecret: process.env.ZOHO_CLIENT_SECRET,
      accountsDomain: process.env.ZOHO_ACCOUNTS_DOMAIN,
    }
  }

  // Try reading from MCP config file
  const mcpConfigPath = path.join(os.homedir(), '.mcp.json')
  if (fs.existsSync(mcpConfigPath)) {
    try {
      const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'))
      const zohoServer = mcpConfig.mcpServers?.['zoho-projects']
      if (zohoServer?.env) {
        console.log('Loaded Zoho credentials from ~/.mcp.json')
        return {
          accessToken: zohoServer.env.ZOHO_ACCESS_TOKEN || '',
          portalId: zohoServer.env.ZOHO_PORTAL_ID || '860aborede',
          apiDomain: zohoServer.env.ZOHO_API_DOMAIN,
          refreshToken: zohoServer.env.ZOHO_REFRESH_TOKEN,
          clientId: zohoServer.env.ZOHO_CLIENT_ID,
          clientSecret: zohoServer.env.ZOHO_CLIENT_SECRET,
          accountsDomain: zohoServer.env.ZOHO_ACCOUNTS_DOMAIN,
        }
      }
    } catch (err) {
      console.warn('Failed to read MCP config:', err)
    }
  }

  return {
    accessToken: '',
    portalId: '860aborede',
  }
}

const zohoConfig = loadZohoConfig()
let ZOHO_ACCESS_TOKEN = zohoConfig.accessToken
const ZOHO_PORTAL_ID = zohoConfig.portalId
const ZOHO_API_DOMAIN = zohoConfig.apiDomain || 'https://projectsapi.zoho.com'

// Token refresh function
async function refreshAccessToken(): Promise<void> {
  if (!zohoConfig.refreshToken || !zohoConfig.clientId || !zohoConfig.clientSecret) {
    return
  }

  const accountsDomain = zohoConfig.accountsDomain || 'https://accounts.zoho.com'
  const params = new URLSearchParams({
    refresh_token: zohoConfig.refreshToken,
    client_id: zohoConfig.clientId,
    client_secret: zohoConfig.clientSecret,
    grant_type: 'refresh_token',
  })

  try {
    const response = await fetch(`${accountsDomain}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    if (response.ok) {
      const data = await response.json() as { access_token: string }
      ZOHO_ACCESS_TOKEN = data.access_token
      console.log('Access token refreshed successfully')
    }
  } catch (err) {
    console.warn('Failed to refresh token:', err)
  }
}

// Parse command line args
const args = process.argv.slice(2)
const zohoProjectId = args.find(a => a.startsWith('--project='))?.split('=')[1] || ''
const projectName = args.find(a => a.startsWith('--name='))?.split('=')[1] || ''
const resetDb = args.includes('--reset')
const skipImages = args.includes('--skip-images')

if (!zohoProjectId) {
  console.error('Usage: npx tsx scripts/importZohoWithImages.ts --project=<zoho-project-id> --name="Project Name" [--reset] [--skip-images]')
  process.exit(1)
}

// Strip HTML tags and decode common HTML entities
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

// Map Zoho status to our status
function mapStatus(zohoStatus: { name: string; is_closed_type?: boolean }): string {
  if (zohoStatus.is_closed_type) {
    return 'done'
  }

  const statusLower = zohoStatus.name.toLowerCase()

  if (statusLower === 'to do' || statusLower === 'todo' || statusLower === 'backlog') {
    return 'todo'
  }
  if (statusLower === 'open') {
    return 'open'
  }
  if (statusLower === 'in progress' || statusLower.includes('progress')) {
    return 'open'
  }
  if (statusLower === 'in review' || statusLower.includes('review')) {
    return 'in_review'
  }
  if (statusLower.includes('approval') || statusLower.includes('await')) {
    return 'awaiting_approval'
  }

  return 'todo'
}

// Map Zoho priority to our priority
function mapPriority(zohoPriority: string): string | undefined {
  if (!zohoPriority || zohoPriority === 'none' || zohoPriority === 'None') return undefined

  const priorityLower = zohoPriority.toLowerCase()

  if (priorityLower.includes('high') || priorityLower.includes('critical') || priorityLower.includes('urgent')) {
    return 'high'
  }
  if (priorityLower.includes('low')) {
    return 'low'
  }
  if (priorityLower.includes('medium') || priorityLower.includes('normal')) {
    return 'medium'
  }
  return undefined
}

// Extract Zoho image URLs from HTML description
function extractZohoImageUrls(html: string): string[] {
  if (!html) return []

  const imgRegex = /<img[^>]+src="([^"]+)"/gi
  const urls: string[] = []
  let match

  while ((match = imgRegex.exec(html)) !== null) {
    const url = match[1]
    // Only get Zoho project attachment URLs
    if (url.includes('projects.zoho.com') || url.includes('projectsapi.zoho.com') || url.includes('viewInlineAttachment')) {
      urls.push(url)
    }
  }

  return urls
}

// Download image from Zoho with authentication - tries multiple endpoints
async function downloadZohoImage(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  // Parse the file parameter from the URL
  let fileParam: string | null = null
  try {
    const urlObj = new URL(url)
    fileParam = urlObj.searchParams.get('file')
  } catch {
    console.warn(`  Invalid URL: ${url.substring(0, 80)}...`)
    return null
  }

  if (!fileParam) {
    console.warn(`  No file parameter in URL: ${url.substring(0, 80)}...`)
    return null
  }

  // Try multiple domains and endpoint formats
  const domains = ['projectsapi.zoho.com', 'projectsapi.zoho.eu', 'projects.zoho.com', 'projects.zoho.eu']
  const endpoints = [
    // Direct viewInlineAttachment endpoint (ForApi variant)
    (domain: string) => `https://${domain.replace('projectsapi.', 'projects.')}/viewInlineAttachmentForApi/image?file=${encodeURIComponent(fileParam!)}`,
    // Direct viewInlineAttachment endpoint (non-ForApi variant)
    (domain: string) => `https://${domain.replace('projectsapi.', 'projects.')}/viewInlineAttachment/image?file=${encodeURIComponent(fileParam!)}`,
    // API endpoint for inline attachments
    (domain: string) => `https://${domain}/restapi/portal/${ZOHO_PORTAL_ID}/inlineattachment/?file=${encodeURIComponent(fileParam!)}`,
  ]

  for (const domain of domains) {
    for (const endpointFn of endpoints) {
      const tryUrl = endpointFn(domain)
      try {
        const response = await fetch(tryUrl, {
          headers: {
            'Authorization': `Zoho-oauthtoken ${ZOHO_ACCESS_TOKEN}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })

        if (!response.ok) continue

        const contentType = response.headers.get('content-type') || 'image/png'
        if (!contentType.startsWith('image/')) continue

        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Skip if too large (>10MB)
        if (buffer.length > 10 * 1024 * 1024) {
          console.warn(`  Image too large: ${buffer.length} bytes`)
          return null
        }

        return { buffer, contentType }
      } catch {
        // Try next endpoint
      }
    }
  }

  console.warn(`  Failed to download from any endpoint: ${url.substring(0, 60)}...`)
  return null
}

// Get file extension from mime type
function getExtension(mimeType: string): string {
  const extMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  }
  return extMap[mimeType] || 'png'
}

// Process task description - download images and replace URLs
async function processDescription(
  description: string,
  organizationId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  taskName: string
): Promise<{ processedHtml: string; imageCount: number }> {
  if (!description || skipImages) {
    return { processedHtml: description || '', imageCount: 0 }
  }

  const imageUrls = extractZohoImageUrls(description)
  if (imageUrls.length === 0) {
    return { processedHtml: description, imageCount: 0 }
  }

  let processedHtml = description
  let imageCount = 0

  for (const url of imageUrls) {
    const imageData = await downloadZohoImage(url)
    if (!imageData) continue

    // Create attachment in database
    const ext = getExtension(imageData.contentType)
    const filename = `zoho-import-${Date.now()}-${imageCount}.${ext}`

    const attachment = await Attachment.create({
      organization: organizationId,
      filename,
      mimeType: imageData.contentType,
      size: imageData.buffer.length,
      data: imageData.buffer.toString('base64'),
      uploadedBy: userId,
    })

    // Replace the Zoho URL with our attachment URL
    const newUrl = `/api/attachments/${attachment._id}`
    processedHtml = processedHtml.replace(url, newUrl)
    imageCount++
  }

  if (imageCount > 0) {
    console.log(`    Downloaded ${imageCount} images for: ${taskName.substring(0, 50)}`)
  }

  return { processedHtml, imageCount }
}

async function fetchZohoTasks(projectId: string): Promise<any[]> {
  const allTasks: any[] = []
  let page = 1
  const perPage = 100

  console.log('Fetching tasks from Zoho...')

  while (true) {
    const url = `${ZOHO_API_DOMAIN}/restapi/portal/${ZOHO_PORTAL_ID}/projects/${projectId}/tasks/?index=${(page - 1) * perPage + 1}&range=${perPage}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${ZOHO_ACCESS_TOKEN}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Zoho API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const tasks = data.tasks || []

    allTasks.push(...tasks)
    console.log(`  Fetched page ${page}: ${tasks.length} tasks (total: ${allTasks.length})`)

    if (tasks.length < perPage) {
      break
    }
    page++
  }

  return allTasks
}

async function fetchZohoMilestones(projectId: string): Promise<any[]> {
  console.log('Fetching milestones from Zoho...')

  // Use v3 API for milestones (phases endpoint)
  const v3BaseUrl = ZOHO_API_DOMAIN.replace('/restapi', '').replace('projectsapi', 'projectsapi') + '/api/v3'
  const url = `${v3BaseUrl}/portal/${ZOHO_PORTAL_ID}/projects/${projectId}/phases?per_page=100`

  const response = await fetch(url, {
    headers: {
      'Authorization': `Zoho-oauthtoken ${ZOHO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    // Fallback to REST API endpoint
    const fallbackUrl = `${ZOHO_API_DOMAIN}/restapi/portal/${ZOHO_PORTAL_ID}/projects/${projectId}/milestones/`
    const fallbackResponse = await fetch(fallbackUrl, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${ZOHO_ACCESS_TOKEN}`,
      },
    })

    if (!fallbackResponse.ok) {
      console.warn(`Failed to fetch milestones: ${response.status}`)
      return []
    }

    const fallbackData = await fallbackResponse.json()
    return fallbackData.milestones || []
  }

  const data = await response.json()
  return data.milestones || []
}

async function fetchZohoProject(projectId: string): Promise<any> {
  console.log('Fetching project details from Zoho...')

  const url = `${ZOHO_API_DOMAIN}/restapi/portal/${ZOHO_PORTAL_ID}/projects/${projectId}/`

  const response = await fetch(url, {
    headers: {
      'Authorization': `Zoho-oauthtoken ${ZOHO_ACCESS_TOKEN}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Zoho API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.projects?.[0] || data
}

async function resetDatabase() {
  console.log('\nResetting database...')

  const deletedSignoffs = await MilestoneSignoff.deleteMany({})
  console.log(`  Deleted ${deletedSignoffs.deletedCount} milestone signoffs`)

  const deletedApprovers = await SpecificationApprover.deleteMany({})
  console.log(`  Deleted ${deletedApprovers.deletedCount} specification approvers`)

  const deletedTasks = await Task.deleteMany({})
  console.log(`  Deleted ${deletedTasks.deletedCount} tasks`)

  const deletedMilestones = await Milestone.deleteMany({})
  console.log(`  Deleted ${deletedMilestones.deletedCount} milestones`)

  const deletedTags = await Tag.deleteMany({})
  console.log(`  Deleted ${deletedTags.deletedCount} tags`)

  const deletedAttachments = await Attachment.deleteMany({})
  console.log(`  Deleted ${deletedAttachments.deletedCount} attachments`)

  const deletedProjects = await Project.deleteMany({})
  console.log(`  Deleted ${deletedProjects.deletedCount} projects`)

  console.log('Database reset complete!')
}

async function main() {
  // Try to refresh access token first
  await refreshAccessToken()

  if (!ZOHO_ACCESS_TOKEN) {
    console.error('ZOHO_ACCESS_TOKEN not found. Set it via environment variable or in ~/.mcp.json')
    process.exit(1)
  }

  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected!')

  try {
    // Reset database if requested
    if (resetDb) {
      await resetDatabase()
    }

    // Find organization and user
    const organization = await Organization.findOne()
    if (!organization) {
      console.error('No organization found. Please create an organization first.')
      process.exit(1)
    }

    const user = await User.findOne()
    if (!user) {
      console.error('No user found. Please create a user first.')
      process.exit(1)
    }

    console.log(`\nImporting to organization: ${organization.name}`)
    console.log(`Using user: ${user.email}`)

    // Fetch data from Zoho
    const [zohoProject, zohoTasks, zohoMilestones] = await Promise.all([
      fetchZohoProject(zohoProjectId),
      fetchZohoTasks(zohoProjectId),
      fetchZohoMilestones(zohoProjectId),
    ])

    // Get project name from Zoho if not provided
    const finalProjectName = projectName || stripHtmlAndDecode(zohoProject.name) || 'Imported Project'

    console.log(`\nProject: ${finalProjectName}`)
    console.log(`Fetched ${zohoTasks.length} tasks and ${zohoMilestones.length} milestones from Zoho`)

    // Check if project already exists
    let project = await Project.findOne({ organization: organization._id, name: finalProjectName })

    if (project) {
      console.log(`\nProject "${finalProjectName}" already exists. Deleting existing tasks...`)
      await Task.deleteMany({ project: project._id })
      await Milestone.deleteMany({ project: project._id })
    } else {
      // Create project
      project = await Project.create({
        organization: organization._id,
        name: finalProjectName,
        description: stripHtmlAndDecode(zohoProject.description) || 'Imported from Zoho Projects',
        status: 'active',
        owner: user._id,
        members: [{ user: user._id, role: 'team' }],
      })
    }

    console.log(`\nProject: ${project.name} (${project.code})`)

    // Create milestones - map by both ID and name for robust linking
    const milestoneIdMap = new Map<string, any>()
    const milestoneNameMap = new Map<string, any>()

    for (const zm of zohoMilestones) {
      const milestoneName = stripHtmlAndDecode(zm.name)
      const milestone = await Milestone.create({
        project: project._id,
        name: milestoneName,
        description: stripHtmlAndDecode(zm.description || ''),
        status: zm.status?.name?.toLowerCase() === 'completed' || zm.status?.is_closed || zm.status_type === 'completed' ? 'completed' : 'active',
        startDate: zm.start_date ? new Date(zm.start_date) : undefined,
        endDate: zm.end_date ? new Date(zm.end_date) : undefined,
      })

      // Map by various ID formats
      milestoneIdMap.set(zm.id.toString(), milestone)
      if (zm.id_string) milestoneIdMap.set(zm.id_string, milestone)

      // Map by name (lowercase for case-insensitive matching)
      milestoneNameMap.set(milestoneName.toLowerCase(), milestone)
    }
    console.log(`Created ${milestoneIdMap.size} milestones`)

    // Create tasks
    let taskNumber = 0
    let tasksCreated = 0
    let totalImages = 0
    const zohoIdToTask = new Map<string, any>()

    console.log('\nImporting tasks...')

    for (const zt of zohoTasks) {
      if (!zt.name) continue

      taskNumber++

      // Find milestone - try ID first, then name
      let milestone = null
      if (zt.milestone?.id) {
        milestone = milestoneIdMap.get(zt.milestone.id.toString())
        // Fallback to name matching
        if (!milestone && zt.milestone?.name) {
          const milestoneName = stripHtmlAndDecode(zt.milestone.name).toLowerCase()
          milestone = milestoneNameMap.get(milestoneName)
        }
      } else if (zt.milestone_id) {
        milestone = milestoneIdMap.get(zt.milestone_id.toString())
      }

      // Parse due date
      let dueDate = null
      if (zt.end_date) {
        const parsed = new Date(zt.end_date)
        if (!isNaN(parsed.getTime())) {
          dueDate = parsed
        }
      }

      // Process description (download and replace images)
      const { processedHtml, imageCount } = await processDescription(
        zt.description || '',
        organization._id,
        user._id,
        zt.name
      )
      totalImages += imageCount

      const task = await Task.create({
        project: project._id,
        taskNumber,
        title: stripHtmlAndDecode(zt.name),
        description: processedHtml,
        status: mapStatus(zt.status || { name: 'To Do' }),
        priority: mapPriority(zt.priority || ''),
        dueDate,
        milestone: milestone?._id || null,
        createdBy: user._id,
      })

      zohoIdToTask.set(zt.id.toString(), task)
      zohoIdToTask.set(zt.id_string, task)
      tasksCreated++

      if (tasksCreated % 50 === 0) {
        console.log(`  Progress: ${tasksCreated} tasks created...`)
      }
    }

    // Link parent tasks
    let subtasksLinked = 0
    for (const zt of zohoTasks) {
      const parentId = zt.parent_task_id || zt.PARENT_TASK_ID
      if (parentId) {
        const childTask = zohoIdToTask.get(zt.id.toString()) || zohoIdToTask.get(zt.id_string)
        const parentTask = zohoIdToTask.get(parentId.toString())

        if (childTask && parentTask) {
          await Task.updateOne(
            { _id: childTask._id },
            { parentTask: parentTask._id }
          )
          subtasksLinked++
        }
      }
    }

    console.log(`\n========================================`)
    console.log(`IMPORT COMPLETE!`)
    console.log(`========================================`)
    console.log(`  Tasks created: ${tasksCreated}`)
    console.log(`  Subtasks linked: ${subtasksLinked}`)
    console.log(`  Milestones created: ${milestoneIdMap.size}`)
    console.log(`  Images imported: ${totalImages}`)
    console.log(`\nProject URL: http://localhost:3000/projects/${project._id}`)

  } finally {
    await mongoose.disconnect()
    console.log('\nDone!')
  }
}

main().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})
