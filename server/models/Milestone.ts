import mongoose, { Schema, type Document } from 'mongoose'

export interface IMilestone {
  _id: mongoose.Types.ObjectId
  project: mongoose.Types.ObjectId
  name: string
  description?: string
  startDate?: Date
  endDate?: Date
  status: 'pending' | 'active' | 'completed'
  isLocked: boolean
  lockedAt?: Date
  lockedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export interface MilestoneDocument extends Omit<IMilestone, '_id'>, Document {}

const MilestoneSchema = new Schema<MilestoneDocument>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed'],
      default: 'active',
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockedAt: {
      type: Date,
    },
    lockedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
)

MilestoneSchema.index({ project: 1 })
MilestoneSchema.index({ project: 1, name: 1 }, { unique: true })

export const Milestone =
  mongoose.models.Milestone ||
  mongoose.model<MilestoneDocument>('Milestone', MilestoneSchema)
