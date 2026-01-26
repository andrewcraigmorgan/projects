import mongoose, { Schema, type Document } from 'mongoose'
import type { IProject, IProjectMember } from '~/types'

export interface ProjectDocument extends Omit<IProject, '_id'>, Document {}

// Embedded schema for project members
const ProjectMemberSchema = new Schema<IProjectMember>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['team', 'client'],
      default: 'team',
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: false }
)

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
    members: [ProjectMemberSchema],
  },
  {
    timestamps: true,
  }
)

ProjectSchema.index({ organization: 1 })
ProjectSchema.index({ organization: 1, status: 1 })
ProjectSchema.index({ organization: 1, code: 1 }, { unique: true, sparse: true })
ProjectSchema.index({ owner: 1 }) // For owner's projects
ProjectSchema.index({ 'members.user': 1 }) // For member's projects
ProjectSchema.index({ organization: 1, createdAt: -1 }) // Recent projects in org

// Pre-save hook to auto-generate project code if not provided
ProjectSchema.pre('save', async function (next) {
  if (this.isNew && !this.code) {
    // Generate code from project name (e.g., "My Project Name" -> "MPN")
    // Filter out non-alphanumeric "words" like hyphens or punctuation
    const words = this.name
      .split(/\s+/)
      .filter((w: string) => w.length > 0 && /^[a-zA-Z0-9]/.test(w))
    let baseCode: string

    if (words.length >= 3) {
      // Use first letter of first three words
      baseCode = words
        .slice(0, 3)
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
    } else if (words.length === 2) {
      // Use first letter of each word, plus second letter of first word
      baseCode = (words[0][0] + words[0][1] + words[1][0]).toUpperCase()
    } else {
      // Use first 3 letters of single word
      baseCode = this.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase()
    }

    // Ensure we have at least 3 characters
    while (baseCode.length < 3) {
      baseCode += 'X'
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
