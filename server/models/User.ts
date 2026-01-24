import mongoose, { Schema, type Document } from 'mongoose'
import type { IUser, IApiKey } from '~/types'

export interface UserDocument extends Omit<IUser, '_id'>, Document {}

const ApiKeySchema = new Schema<IApiKey>(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date },
  },
  { _id: false }
)

const UserSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
    },
    organizations: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
      },
    ],
    apiKeys: [ApiKeySchema],
  },
  {
    timestamps: true,
  }
)

UserSchema.index({ 'apiKeys.key': 1 })
UserSchema.index({ organizations: 1 }) // For org membership queries
UserSchema.index({ createdAt: -1 }) // For user listing

export const User =
  mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema)
