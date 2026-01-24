import mongoose, { Schema, Document } from 'mongoose'

export interface IAttachment extends Document {
  organization: mongoose.Types.ObjectId
  filename: string
  mimeType: string
  size: number
  data: string  // base64 encoded
  uploadedBy: mongoose.Types.ObjectId
  createdAt: Date
}

const attachmentSchema = new Schema<IAttachment>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    data: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Index for faster lookups
attachmentSchema.index({ organization: 1, createdAt: -1 })

export const Attachment = mongoose.model<IAttachment>('Attachment', attachmentSchema)
