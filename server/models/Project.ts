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
    code: {
      type: String,
      uppercase: true,
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
ProjectSchema.index({ organization: 1, code: 1 }, { unique: true, sparse: true })

// Pre-save hook to auto-generate project code if not provided
ProjectSchema.pre('save', async function (next) {
  if (this.isNew && !this.code) {
    // Generate code from project name (e.g., "My Project Name" -> "MPN")
    const words = this.name.split(/\s+/).filter((w: string) => w.length > 0)
    let baseCode: string

    if (words.length >= 2) {
      // Use first letter of first two words plus first letter of last word
      baseCode = words
        .slice(0, 3)
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
    } else {
      // Use first 3 letters of single word
      baseCode = this.name.substring(0, 3).toUpperCase()
    }

    // Ensure uniqueness within organization by appending number if needed
    let code = baseCode
    let counter = 1
    const Project = mongoose.model('Project')

    while (
      await Project.findOne({ organization: this.organization, code })
    ) {
      code = `${baseCode}${counter}`
      counter++
    }

    this.code = code
  }
  next()
})

export const Project =
  mongoose.models.Project ||
  mongoose.model<ProjectDocument>('Project', ProjectSchema)
