import { z } from 'zod'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { existsSync } from 'fs'
import { requireOrganizationMember } from '../../utils/tenant'

const bodySchema = z.object({
  organizationId: z.string(),
  imageUrl: z.string().url(),
})

/**
 * @group Attachments
 * @description Proxy an external image URL - fetches the image server-side and stores it
 * @authenticated
 * @body { "organizationId": "string", "imageUrl": "string" }
 * @response 200 { "success": true, "data": { "url": "string" } }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = bodySchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: result.error.errors[0].message,
    })
  }

  const { organizationId, imageUrl } = result.data

  // Verify organization access
  await requireOrganizationMember(event, organizationId)

  try {
    // Fetch the image from the external URL
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)',
      },
    })

    if (!response.ok) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `Failed to fetch image: ${response.status} ${response.statusText}`,
      })
    }

    const contentType = response.headers.get('content-type') || 'image/png'

    // Validate it's actually an image
    if (!contentType.startsWith('image/')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'URL does not point to an image',
      })
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Limit file size to 10MB
    if (buffer.length > 10 * 1024 * 1024) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Image too large (max 10MB)',
      })
    }

    // Determine file extension from content type
    const extMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
    }
    const ext = extMap[contentType] || 'png'

    // Generate unique filename
    const filename = `${randomUUID()}.${ext}`

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads', 'attachments', organizationId)
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Save file
    const filePath = join(uploadsDir, filename)
    await writeFile(filePath, buffer)

    // Return the URL to access the attachment
    const url = `/api/attachments/${organizationId}/${filename}`

    return {
      success: true,
      data: {
        url,
        contentType,
        size: buffer.length,
      },
    }
  } catch (error) {
    // If it's already a createError, rethrow it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    console.error('Failed to proxy image:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to fetch and store image',
    })
  }
})
