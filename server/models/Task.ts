import mongoose, { Schema, type Document } from 'mongoose'
import type { ITask } from '~/types'

export interface TaskDocument extends Omit<ITask, '_id'>, Document {}

const TaskSchema = new Schema<TaskDocument>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    title: {
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
      enum: ['todo', 'in_progress', 'review', 'done'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    dueDate: {
      type: Date,
    },
    parentTask: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    depth: {
      type: Number,
      default: 0,
    },
    path: {
      type: String,
      default: '',
    },
    order: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for efficient queries
TaskSchema.index({ project: 1, status: 1 })
TaskSchema.index({ project: 1, parentTask: 1 })
TaskSchema.index({ path: 1 }) // For ancestor/descendant queries
TaskSchema.index({ assignee: 1 })
TaskSchema.index({ project: 1, order: 1 })

// Pre-save hook to set path for hierarchical queries
TaskSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('parentTask')) {
    if (this.parentTask) {
      const parent = await mongoose.model('Task').findById(this.parentTask)
      if (parent) {
        this.depth = parent.depth + 1
        this.path = parent.path
          ? `${parent.path}/${parent._id}`
          : `${parent._id}`
      }
    } else {
      this.depth = 0
      this.path = ''
    }
  }
  next()
})

export const Task =
  mongoose.models.Task || mongoose.model<TaskDocument>('Task', TaskSchema)
