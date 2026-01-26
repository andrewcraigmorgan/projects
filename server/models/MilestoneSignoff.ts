import mongoose, { Schema, type Document } from 'mongoose'

export interface IMilestoneSignoff {
  _id: mongoose.Types.ObjectId
  milestone: mongoose.Types.ObjectId
  project: mongoose.Types.ObjectId
  signedBy: mongoose.Types.ObjectId
  signedAt: Date
  signatureNotes?: string
  createdAt: Date
  updatedAt: Date
}

export interface MilestoneSignoffDocument extends Omit<IMilestoneSignoff, '_id'>, Document {}

const MilestoneSignoffSchema = new Schema<MilestoneSignoffDocument>(
  {
    milestone: {
      type: Schema.Types.ObjectId,
      ref: 'Milestone',
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    signedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    signedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    signatureNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

// Each user can only sign off a milestone once
MilestoneSignoffSchema.index({ milestone: 1, signedBy: 1 }, { unique: true })
MilestoneSignoffSchema.index({ milestone: 1 })
MilestoneSignoffSchema.index({ project: 1 })

export const MilestoneSignoff =
  mongoose.models.MilestoneSignoff ||
  mongoose.model<MilestoneSignoffDocument>('MilestoneSignoff', MilestoneSignoffSchema)
