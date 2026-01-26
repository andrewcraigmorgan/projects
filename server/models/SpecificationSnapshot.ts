import mongoose, { Schema, type Document } from 'mongoose'

export interface ISnapshotTask {
  taskNumber: number
  title: string
  description: string
  status: string
  priority: string
  assignees: string[] // User names at time of snapshot
  dueDate?: Date
  subtasks: ISnapshotTask[]
}

export interface ISnapshotSignoff {
  userName: string
  signedAt: Date
  notes?: string
}

export interface ISnapshotData {
  milestone: {
    name: string
    description?: string
    startDate?: Date
    endDate?: Date
    status: string
  }
  tasks: ISnapshotTask[]
  signoffs: ISnapshotSignoff[]
  generatedAt: Date
}

export interface ISpecificationSnapshot {
  _id: mongoose.Types.ObjectId
  project: mongoose.Types.ObjectId
  milestone: mongoose.Types.ObjectId
  version: number
  snapshotData: ISnapshotData
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export interface SpecificationSnapshotDocument extends Omit<ISpecificationSnapshot, '_id'>, Document {}

const SnapshotTaskSchema = new Schema(
  {
    taskNumber: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, required: true },
    priority: { type: String, required: true },
    assignees: [{ type: String }],
    dueDate: { type: Date },
    subtasks: { type: Array, default: [] },
  },
  { _id: false }
)

const SnapshotSignoffSchema = new Schema(
  {
    userName: { type: String, required: true },
    signedAt: { type: Date, required: true },
    notes: { type: String },
  },
  { _id: false }
)

const SnapshotDataSchema = new Schema(
  {
    milestone: {
      name: { type: String, required: true },
      description: { type: String },
      startDate: { type: Date },
      endDate: { type: Date },
      status: { type: String, required: true },
    },
    tasks: [SnapshotTaskSchema],
    signoffs: [SnapshotSignoffSchema],
    generatedAt: { type: Date, required: true },
  },
  { _id: false }
)

const SpecificationSnapshotSchema = new Schema<SpecificationSnapshotDocument>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    milestone: {
      type: Schema.Types.ObjectId,
      ref: 'Milestone',
      required: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    snapshotData: {
      type: SnapshotDataSchema,
      required: true,
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

SpecificationSnapshotSchema.index({ project: 1 })
SpecificationSnapshotSchema.index({ milestone: 1 })
SpecificationSnapshotSchema.index({ project: 1, milestone: 1, version: 1 }, { unique: true })

export const SpecificationSnapshot =
  mongoose.models.SpecificationSnapshot ||
  mongoose.model<SpecificationSnapshotDocument>('SpecificationSnapshot', SpecificationSnapshotSchema)
