import mongoose, { Schema, type Document } from 'mongoose'
import type { IAuditLog, AuditAction, AuditResourceType } from '~/types'

export interface AuditLogDocument extends Omit<IAuditLog, '_id'>, Document {}

// Embedded schema for actor (denormalized for immutability)
const AuditActorSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    authMethod: {
      type: String,
      enum: ['session', 'api_key'],
      default: 'session',
    },
  },
  { _id: false }
)

// Embedded schema for resource reference
const AuditResourceSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        'task',
        'project',
        'milestone',
        'comment',
        'tag',
        'organization',
        'invitation',
        'api_key',
        'approver',
        'member',
        'signoff',
      ] satisfies AuditResourceType[],
      required: true,
    },
    id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    name: {
      type: String,
    },
  },
  { _id: false }
)

// Embedded schema for changes
const AuditChangeSchema = new Schema(
  {
    field: {
      type: String,
      required: true,
    },
    oldValue: {
      type: Schema.Types.Mixed,
    },
    newValue: {
      type: Schema.Types.Mixed,
    },
  },
  { _id: false }
)

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    actor: {
      type: AuditActorSchema,
      required: true,
    },
    action: {
      type: String,
      enum: [
        'create',
        'update',
        'delete',
        'status_change',
        'move',
        'lock',
        'unlock',
        'signoff',
        'revoke_signoff',
        'add_member',
        'remove_member',
        'change_role',
        'invite',
        'accept_invite',
        'add_approver',
        'remove_approver',
      ] satisfies AuditAction[],
      required: true,
    },
    resource: {
      type: AuditResourceSchema,
      required: true,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },
    changes: [AuditChangeSchema],
    metadata: {
      type: Schema.Types.Mixed,
    },
    ip: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

// Indexes for efficient querying
AuditLogSchema.index({ 'actor.userId': 1, createdAt: -1 }) // User activity
AuditLogSchema.index({ organization: 1, createdAt: -1 }) // Org audit log
AuditLogSchema.index({ project: 1, createdAt: -1 }) // Project audit log
AuditLogSchema.index({ 'resource.type': 1, 'resource.id': 1, createdAt: -1 }) // Resource history
AuditLogSchema.index({ organization: 1, action: 1, createdAt: -1 }) // Filter by action

export const AuditLog =
  mongoose.models.AuditLog ||
  mongoose.model<AuditLogDocument>('AuditLog', AuditLogSchema)
