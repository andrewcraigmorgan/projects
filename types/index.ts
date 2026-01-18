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

export interface IProject {
  _id: Types.ObjectId
  organization: Types.ObjectId
  name: string
  description: string
  status: ProjectStatus
  owner: Types.ObjectId
  members: Types.ObjectId[]
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
  assignee?: Types.ObjectId
  dueDate?: Date
  parentTask?: Types.ObjectId
  depth: number
  path: string
  order: number
  createdBy: Types.ObjectId
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
