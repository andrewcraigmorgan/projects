import type { H3Event } from 'h3'
import { AuditLog } from '../models/AuditLog'
import { User } from '../models/User'
import type {
  AuditAction,
  AuditResourceType,
  IAuditChange,
  IAuditActor,
} from '~/types'

export interface AuditContext {
  actor: IAuditActor
  organization: string
  project?: string
  ip?: string
  userAgent?: string
}

export interface CreateAuditLogOptions {
  action: AuditAction
  resourceType: AuditResourceType
  resourceId: string
  resourceName?: string
  changes?: IAuditChange[]
  metadata?: Record<string, unknown>
}

/**
 * Build audit context from an H3 event.
 * This extracts user info, IP address, and user agent from the request.
 */
export async function auditContext(
  event: H3Event,
  options: { organization: string; project?: string }
): Promise<AuditContext> {
  const auth = event.context.auth
  if (!auth) {
    throw new Error('Cannot create audit context without authenticated user')
  }

  // Get user details for denormalization
  let userName = 'Unknown'
  let authMethod: 'session' | 'api_key' = 'session'

  // Check if user was loaded by middleware
  if (event.context.user) {
    userName = event.context.user.name
  } else {
    // Load user from database
    const user = await User.findById(auth.userId).select('name')
    if (user) {
      userName = user.name
    }
  }

  // Check if authenticated via API key
  const apiKey = getHeader(event, 'x-api-key')
  if (apiKey) {
    authMethod = 'api_key'
  }

  // Extract IP address
  const forwardedFor = getHeader(event, 'x-forwarded-for')
  const ip = forwardedFor
    ? forwardedFor.split(',')[0].trim()
    : getRequestIP(event) || undefined

  // Extract user agent
  const userAgent = getHeader(event, 'user-agent') || undefined

  return {
    actor: {
      userId: auth.userId as unknown as import('mongoose').Types.ObjectId,
      email: auth.email,
      name: userName,
      authMethod,
    },
    organization: options.organization,
    project: options.project,
    ip,
    userAgent,
  }
}

/**
 * Create an audit log entry.
 * This should be called after successful operations to record what changed.
 */
export async function createAuditLog(
  ctx: AuditContext,
  options: CreateAuditLogOptions
): Promise<void> {
  try {
    await AuditLog.create({
      actor: ctx.actor,
      action: options.action,
      resource: {
        type: options.resourceType,
        id: options.resourceId,
        name: options.resourceName,
      },
      organization: ctx.organization,
      project: ctx.project,
      changes: options.changes,
      metadata: options.metadata,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })
  } catch (error) {
    // Log error but don't throw - audit failures shouldn't break main operations
    console.error('Failed to create audit log:', error)
  }
}

/**
 * Compute changes between old and new document states.
 * Only tracks changes for specified fields.
 */
export function computeChanges(
  oldDoc: Record<string, unknown>,
  newDoc: Record<string, unknown>,
  fields: string[]
): IAuditChange[] {
  const changes: IAuditChange[] = []

  for (const field of fields) {
    const oldValue = getNestedValue(oldDoc, field)
    const newValue = getNestedValue(newDoc, field)

    // Skip if values are equal
    if (areEqual(oldValue, newValue)) {
      continue
    }

    changes.push({
      field,
      oldValue: serializeValue(oldValue),
      newValue: serializeValue(newValue),
    })
  }

  return changes
}

/**
 * Get a nested value from an object using dot notation.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

/**
 * Compare two values for equality.
 * Handles ObjectIds, Dates, arrays, and objects.
 */
function areEqual(a: unknown, b: unknown): boolean {
  // Handle null/undefined
  if (a === b) return true
  if (a === null || b === null) return false
  if (a === undefined || b === undefined) return false

  // Handle ObjectIds (compare string representations)
  if (hasToString(a) && hasToString(b)) {
    const aStr = a.toString()
    const bStr = b.toString()
    // ObjectIds are 24 character hex strings
    if (aStr.length === 24 && bStr.length === 24) {
      return aStr === bStr
    }
  }

  // Handle Dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, index) => areEqual(item, b[index]))
  }

  // Handle plain objects
  if (typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a as object)
    const bKeys = Object.keys(b as object)
    if (aKeys.length !== bKeys.length) return false
    return aKeys.every((key) =>
      areEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    )
  }

  return a === b
}

/**
 * Type guard for objects with toString method
 */
function hasToString(obj: unknown): obj is { toString(): string } {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'toString' in obj &&
    typeof (obj as { toString: unknown }).toString === 'function'
  )
}

/**
 * Serialize a value for storage in audit log.
 * Converts ObjectIds to strings, Dates to ISO strings, etc.
 */
function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value
  }

  // Handle ObjectIds
  if (hasToString(value) && value.toString().length === 24) {
    return value.toString()
  }

  // Handle Dates
  if (value instanceof Date) {
    return value.toISOString()
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(serializeValue)
  }

  // Handle plain objects
  if (typeof value === 'object') {
    const serialized: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      serialized[key] = serializeValue(val)
    }
    return serialized
  }

  return value
}
