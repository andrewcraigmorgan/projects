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
    taskNumber: {
      type: Number,
      default: 0,
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
      enum: ['todo', 'awaiting_approval', 'open', 'in_review', 'done'],
      default: 'todo',
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
    },
    assignees: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    dueDate: {
      type: Date,
    },
    estimatedHours: {
      type: Number,
    },
    isExternal: {
      type: Boolean,
      default: false,
    },
    milestone: {
      type: Schema.Types.ObjectId,
      ref: 'Milestone',
    },
    tags: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Tag',
      },
    ],
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
TaskSchema.index({ project: 1, taskNumber: -1 }) // For task number auto-increment and lookups
TaskSchema.index({ path: 1 }) // For ancestor/descendant queries
TaskSchema.index({ assignees: 1 })
TaskSchema.index({ project: 1, order: 1 })

// Additional indexes for load testing / scale
TaskSchema.index({ project: 1, status: 1, priority: 1 }) // Filtered queries
TaskSchema.index({ project: 1, dueDate: 1 }) // Date range queries
TaskSchema.index({ project: 1, assignees: 1, status: 1 }) // Assigned task queries
TaskSchema.index({ project: 1, parentTask: 1, order: 1 }) // Hierarchical ordering
TaskSchema.index({ project: 1, createdAt: -1 }) // Recent tasks
TaskSchema.index({ createdBy: 1, createdAt: -1 }) // User's created tasks

// Pre-save hook to set path for hierarchical queries and auto-assign taskNumber
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

  // Auto-assign taskNumber if not set (new task with default 0)
  if (this.isNew && this.taskNumber === 0) {
    const maxTask = await mongoose.model('Task').findOne({ project: this.project })
      .sort({ taskNumber: -1 })
      .select('taskNumber')
    this.taskNumber = (maxTask?.taskNumber || 0) + 1
  }

  next()
})

export const Task =
  mongoose.models.Task || mongoose.model<TaskDocument>('Task', TaskSchema)
