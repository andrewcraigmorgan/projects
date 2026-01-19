import mongoose, { Schema, type Document } from 'mongoose'
import type { IComment } from '~/types'

export interface CommentDocument extends Omit<IComment, '_id'>, Document {}

const CommentSchema = new Schema<CommentDocument>(
  {
    task: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    authorEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    authorName: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      enum: ['app', 'email'],
      default: 'app',
      required: true,
    },
    emailMessageId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for efficient queries
CommentSchema.index({ task: 1, createdAt: 1 })
CommentSchema.index({ author: 1 })
CommentSchema.index({ emailMessageId: 1 }, { sparse: true })

export const Comment =
  mongoose.models.Comment || mongoose.model<CommentDocument>('Comment', CommentSchema)
