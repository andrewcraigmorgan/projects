import mongoose, { Schema, type Document } from 'mongoose'
import type { IInvitation } from '~/types'

export interface InvitationDocument extends Omit<IInvitation, '_id'>, Document {}

const InvitationSchema = new Schema<InvitationDocument>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    role: {
      type: String,
      enum: ['team', 'client'],
      default: 'client',
    },
    token: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired'],
      default: 'pending',
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
InvitationSchema.index({ token: 1 }, { unique: true })
InvitationSchema.index({ email: 1, project: 1 })
InvitationSchema.index({ project: 1, status: 1 })
InvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // TTL index for auto-cleanup

export const Invitation =
  mongoose.models.Invitation ||
  mongoose.model<InvitationDocument>('Invitation', InvitationSchema)
