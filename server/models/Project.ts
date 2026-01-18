import mongoose, { Schema, type Document } from 'mongoose'
import type { IProject } from '~/types'

export interface ProjectDocument extends Omit<IProject, '_id'>, Document {}

const ProjectSchema = new Schema<ProjectDocument>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
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
    status: {
      type: String,
      enum: ['active', 'archived', 'completed'],
      default: 'active',
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
)

ProjectSchema.index({ organization: 1 })
ProjectSchema.index({ organization: 1, status: 1 })

export const Project =
  mongoose.models.Project ||
  mongoose.model<ProjectDocument>('Project', ProjectSchema)
