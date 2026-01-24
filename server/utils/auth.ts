import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import type { AuthPayload, MagicLinkPayload, ProjectRole } from '~/types'

const SALT_ROUNDS = 10

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(payload: AuthPayload, expiresIn: string = '7d'): string {
  const config = useRuntimeConfig()
  return jwt.sign(payload, config.jwtSecret, { expiresIn })
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const config = useRuntimeConfig()
    return jwt.verify(token, config.jwtSecret) as AuthPayload
  } catch {
    return null
  }
}

export function generateApiKey(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let key = 'pk_'
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}

export interface ResetTokenPayload {
  userId: string
  email: string
  type: 'password-reset'
}

export function generateResetToken(userId: string, email: string): string {
  const config = useRuntimeConfig()
  return jwt.sign(
    { userId, email, type: 'password-reset' } as ResetTokenPayload,
    config.jwtSecret,
    { expiresIn: '15m' }
  )
}

export function verifyResetToken(token: string): ResetTokenPayload | null {
  try {
    const config = useRuntimeConfig()
    const payload = jwt.verify(token, config.jwtSecret) as ResetTokenPayload
    if (payload.type !== 'password-reset') {
      return null
    }
    return payload
  } catch {
    return null
  }
}

// Magic link tokens
export function generateMagicLinkToken(userId: string, email: string): string {
  const config = useRuntimeConfig()
  const payload: MagicLinkPayload = { userId, email, type: 'magic-link' }
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '15m' })
}

export function verifyMagicLinkToken(token: string): MagicLinkPayload | null {
  try {
    const config = useRuntimeConfig()
    const payload = jwt.verify(token, config.jwtSecret) as MagicLinkPayload
    if (payload.type !== 'magic-link') {
      return null
    }
    return payload
  } catch {
    return null
  }
}

// Secure random token for invitations (not JWT-based, stored in DB)
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}
