import { Attachment } from '../../models/Attachment'

/**
 * @group Attachments
 * @description Get an attachment by ID (serves the image)
 * @urlParam id string required Attachment ID
 * @response 200 Binary image data
 * @response 404 { "success": false, "error": "Attachment not found" }
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Attachment ID is required',
    })
  }

  const attachment = await Attachment.findById(id)
  if (!attachment) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Attachment not found',
    })
  }

  // Convert base64 to buffer
  const buffer = Buffer.from(attachment.data, 'base64')

  // Set appropriate headers
  setHeader(event, 'Content-Type', attachment.mimeType)
  setHeader(event, 'Content-Length', buffer.length.toString())
  setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable') // Cache for 1 year
  setHeader(event, 'Content-Disposition', `inline; filename="${attachment.filename}"`)

  return buffer
})
