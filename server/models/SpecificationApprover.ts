import mongoose, { Schema, type Document } from 'mongoose'

export interface ISpecificationApprover {
  _id: mongoose.Types.ObjectId
  project: mongoose.Types.ObjectId
  user: mongoose.Types.ObjectId
  addedBy: mongoose.Types.ObjectId
  addedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface SpecificationApproverDocument extends Omit<ISpecificationApprover, '_id'>, Document {}

const SpecificationApproverSchema = new Schema<SpecificationApproverDocument>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    addedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

// Each user can only be an approver once per project
SpecificationApproverSchema.index({ project: 1, user: 1 }, { unique: true })
SpecificationApproverSchema.index({ project: 1 })

export const SpecificationApprover =
  mongoose.models.SpecificationApprover ||
  mongoose.model<SpecificationApproverDocument>('SpecificationApprover', SpecificationApproverSchema)
