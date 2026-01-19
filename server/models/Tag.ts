import mongoose, { Schema, type Document } from 'mongoose'

export interface ITag {
  _id: mongoose.Types.ObjectId
  project: mongoose.Types.ObjectId
  name: string
  color: string
  createdAt: Date
  updatedAt: Date
}

export interface TagDocument extends Omit<ITag, '_id'>, Document {}

// Default tag colors for auto-generated tags
const TAG_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#6366F1', // indigo
  '#84CC16', // lime
]

const TagSchema = new Schema<TagDocument>(
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
    color: {
      type: String,
      default: function () {
        // Assign a random color from the palette
        return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
      },
    },
  },
  {
    timestamps: true,
  }
)

TagSchema.index({ project: 1 })
TagSchema.index({ project: 1, name: 1 }, { unique: true })

export const Tag =
  mongoose.models.Tag || mongoose.model<TagDocument>('Tag', TagSchema)
