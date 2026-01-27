import type { Types } from 'mongoose'

// User types
export interface IUser {
  _id: Types.ObjectId
  email: string
  password: string
  name: string
  avatar?: string
  organizations: Types.ObjectId[]
  apiKeys: IApiKey[]
  createdAt: Date
  updatedAt: Date
}

export interface IApiKey {
  key: string
  name: string
  createdAt: Date
  lastUsedAt?: Date
}

export type UserPublic = Omit<IUser, 'password' | 'apiKeys'>

// Organization types
export type OrgRole = 'owner' | 'admin' | 'member'

export interface IOrgMember {
  user: Types.ObjectId
  role: OrgRole
  joinedAt: Date
}

export interface IOrganization {
  _id: Types.ObjectId
  name: string
  slug: string
  owner: Types.ObjectId
  members: IOrgMember[]
  createdAt: Date
  updatedAt: Date
}

// Project types
export type ProjectStatus = 'active' | 'archived' | 'completed'
export type ProjectRole = 'team' | 'client'

export interface IProjectMember {
  user: Types.ObjectId
  role: ProjectRole
  addedAt: Date
  addedBy?: Types.ObjectId
}

export interface IProject {
  _id: Types.ObjectId
  organization: Types.ObjectId
  name: string
  code: string
  description: string
  status: ProjectStatus
  owner: Types.ObjectId
  members: IProjectMember[]
  createdAt: Date
  updatedAt: Date
}

// Invitation types
export type InvitationStatus = 'pending' | 'accepted' | 'expired'

export interface IInvitation {
  _id: Types.ObjectId
  email: string
  project: Types.ObjectId
  role: ProjectRole
  token: string
  status: InvitationStatus
  invitedBy: Types.ObjectId
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

// Task types
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface ITask {
  _id: Types.ObjectId
  project: Types.ObjectId
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assignees?: Types.ObjectId[]
  dueDate?: Date
  parentTask?: Types.ObjectId
  depth: number
  path: string
  order: number
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

// Comment types
export type CommentSource = 'app' | 'email'

export interface IComment {
  _id: Types.ObjectId
  task: Types.ObjectId
  author?: Types.ObjectId
  authorEmail?: string
  authorName?: string
  content: string
  source: CommentSource
  emailMessageId?: string
  createdAt: Date
  updatedAt: Date
}

// Task Subscription types
export interface ITaskSubscription {
  _id: Types.ObjectId
  task: Types.ObjectId
  user: Types.ObjectId
  subscribedAt: Date
  createdAt: Date
  updatedAt: Date
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Auth types
export interface AuthPayload {
  userId: string
  email: string
  organizationId?: string
}

export interface MagicLinkPayload {
  userId: string
  email: string
  type: 'magic-link'
}

export interface InviteTokenPayload {
  email: string
  projectId: string
  role: ProjectRole
  type: 'invitation'
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

// Pagination
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Milestone types
export interface IMilestone {
  _id: Types.ObjectId
  project: Types.ObjectId
  name: string
  description?: string
  startDate?: Date
  endDate?: Date
  status: 'pending' | 'active' | 'completed'
  isLocked: boolean
  lockedAt?: Date
  lockedBy?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

// Specification types
export interface IMilestoneSignoff {
  _id: Types.ObjectId
  milestone: Types.ObjectId
  project: Types.ObjectId
  signedBy: Types.ObjectId
  signedAt: Date
  signatureNotes?: string
  createdAt: Date
  updatedAt: Date
}

export interface ISpecificationApprover {
  _id: Types.ObjectId
  project: Types.ObjectId
  user: Types.ObjectId
  addedBy: Types.ObjectId
  addedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface ISnapshotTask {
  taskNumber: number
  title: string
  description: string
  status: string
  priority: string
  assignees: string[]
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
  _id: Types.ObjectId
  project: Types.ObjectId
  milestone: Types.ObjectId
  version: number
  snapshotData: ISnapshotData
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

// Sign-off status for a milestone
export type SignoffStatus = 'pending' | 'partial' | 'complete'

export interface IMilestoneSignoffStatus {
  status: SignoffStatus
  totalApprovers: number
  signedCount: number
  approvers: Array<{
    user: {
      _id: Types.ObjectId
      name: string
      email: string
    }
    hasSigned: boolean
    signedAt?: Date
  }>
}

// Audit Log types
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'move'
  | 'lock'
  | 'unlock'
  | 'signoff'
  | 'revoke_signoff'
  | 'add_member'
  | 'remove_member'
  | 'change_role'
  | 'invite'
  | 'accept_invite'
  | 'add_approver'
  | 'remove_approver'

export type AuditResourceType =
  | 'task'
  | 'project'
  | 'milestone'
  | 'comment'
  | 'tag'
  | 'organization'
  | 'invitation'
  | 'api_key'
  | 'approver'
  | 'member'
  | 'signoff'

export interface IAuditActor {
  userId: Types.ObjectId
  email: string
  name: string
  authMethod?: 'session' | 'api_key'
}

export interface IAuditResource {
  type: AuditResourceType
  id: Types.ObjectId
  name?: string
}

export interface IAuditChange {
  field: string
  oldValue?: unknown
  newValue?: unknown
}

export interface IAuditLog {
  _id: Types.ObjectId
  actor: IAuditActor
  action: AuditAction
  resource: IAuditResource
  organization: Types.ObjectId
  project?: Types.ObjectId
  changes?: IAuditChange[]
  metadata?: Record<string, unknown>
  ip?: string
  userAgent?: string
  createdAt: Date
}
