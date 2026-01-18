import mongoose, { Schema, type Document } from 'mongoose'
import type { IOrganization, IOrgMember } from '~/types'

export interface OrganizationDocument
  extends Omit<IOrganization, '_id'>,
    Document {}

const OrgMemberSchema = new Schema<IOrgMember>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
)

const OrganizationSchema = new Schema<OrganizationDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [OrgMemberSchema],
  },
  {
    timestamps: true,
  }
)

OrganizationSchema.index({ slug: 1 })
OrganizationSchema.index({ 'members.user': 1 })

export const Organization =
  mongoose.models.Organization ||
  mongoose.model<OrganizationDocument>('Organization', OrganizationSchema)
