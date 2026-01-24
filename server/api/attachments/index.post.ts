import { Attachment } from '../../models/Attachment'
import { requireOrganizationMember } from '../../utils/tenant'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

/**
 * @group Attachments
 * @description Upload an image attachment
 * @authenticated
 * @bodyParam organizationId string required Organization ID
 * @bodyParam filename string required Original filename
 * @bodyParam mimeType string required MIME type
 * @bodyParam data string required Base64 encoded file data
 * @response 201 { "success": true, "data": { "attachment": {...} } }
 * @response 400 { "success": false, "error": "Invalid file" }
 */
export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const body = await readBody(event)
  const { organizationId, filename, mimeType, data } = body

  if (!organizationId || !filename || !mimeType || !data) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'organizationId, filename, mimeType, and data are required',
    })
  }

  // Verify organization membership
  await requireOrganizationMember(event, organizationId)

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: `File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    })
  }

  // Calculate size from base64 (base64 is ~4/3 the size of binary)
  const base64Data = data.replace(/^data:[^;]+;base64,/, '')
  const size = Math.ceil((base64Data.length * 3) / 4)

  if (size > MAX_FILE_SIZE) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    })
  }

  // Create attachment
  const attachment = await Attachment.create({
    organization: organizationId,
    filename,
    mimeType,
    size,
    data: base64Data, // Store without the data URL prefix
    uploadedBy: auth.userId,
  })

  return {
    success: true,
    data: {
      attachment: {
        id: attachment._id,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
        url: `/api/attachments/${attachment._id}`,
        createdAt: attachment.createdAt,
      },
    },
  }
})
