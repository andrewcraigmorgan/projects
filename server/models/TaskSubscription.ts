import mongoose, { Schema, type Document } from 'mongoose'
import type { ITaskSubscription } from '~/types'

export interface TaskSubscriptionDocument extends Omit<ITaskSubscription, '_id'>, Document {}

const TaskSubscriptionSchema = new Schema<TaskSubscriptionDocument>(
  {
    task: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

// Compound unique index to prevent duplicate subscriptions
TaskSubscriptionSchema.index({ task: 1, user: 1 }, { unique: true })

// Index for efficient lookups by task
TaskSubscriptionSchema.index({ task: 1 })

// Index for efficient lookups by user
TaskSubscriptionSchema.index({ user: 1 })

export const TaskSubscription =
  mongoose.models.TaskSubscription ||
  mongoose.model<TaskSubscriptionDocument>('TaskSubscription', TaskSubscriptionSchema)
