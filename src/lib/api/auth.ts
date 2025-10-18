import { clearToken, getToken, getTokenExpiry, setToken } from '../session'
import { request } from './client'
import type {
  AuthResponseDto,
  LoginDto,
  RegisterDto,
  SessionUser,
} from './types'

type ClaimValue = string | number | null | undefined

interface JwtPayload {
  sub?: ClaimValue
  email?: ClaimValue
  exp?: number
  nameidentifier?: ClaimValue
  [key: string]: unknown
}

const base64UrlDecode = (segment: string) => {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padding = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4))
  const normalized = `${base64}${padding}`

  const atobImpl =
    typeof globalThis !== 'undefined' && typeof globalThis.atob === 'function'
      ? globalThis.atob.bind(globalThis)
      : null

  if (atobImpl) {
    const binary = atobImpl(normalized)
    try {
      return decodeURIComponent(
        binary
          .split('')
          .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join('')
      )
    } catch {
      return binary
    }
  }

  const bufferCtor = (globalThis as unknown as {
    Buffer?: {
      from: (input: string, encoding: string) => { toString: (encoding: string) => string }
    }
  }).Buffer

  if (bufferCtor && typeof bufferCtor.from === 'function') {
    return bufferCtor.from(normalized, 'base64').toString('utf-8')
  }

  throw new Error('No base64 decoder available')
}

const decodeJwtPayload = (token: string): JwtPayload | null => {
  try {
    const [, payloadSegment] = token.split('.')
    if (!payloadSegment) return null
    const json = base64UrlDecode(payloadSegment)
    return JSON.parse(json) as JwtPayload
  } catch (error) {
    console.error('Failed to decode JWT payload', error)
    return null
  }
}

const resolveExpiresAt = (storedExpiry: number | null, payloadExp?: number) => {
  const claimExpiry = typeof payloadExp === 'number' ? payloadExp * 1000 : null
  return storedExpiry ?? claimExpiry ?? null
}

const CLAIM_URIS = {
  email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
  nameIdentifier: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
}

const resolveClaim = (payload: JwtPayload, ...keys: (keyof JwtPayload | string)[]): ClaimValue => {
  for (const key of keys) {
    const value = payload[key as keyof JwtPayload] as ClaimValue
    if (value !== undefined && value !== null) {
      return value
    }
  }
  return undefined
}

export const getSessionUser = (): SessionUser | null => {
  const token = getToken()
  if (!token) return null

  const payload = decodeJwtPayload(token)
  if (!payload) {
    clearToken()
    return null
  }

  const rawEmail = resolveClaim(payload, 'email', CLAIM_URIS.email)
  const rawUserId = resolveClaim(payload, 'sub', 'nameidentifier', CLAIM_URIS.nameIdentifier)

  if (!rawUserId || !rawEmail) {
    clearToken()
    return null
  }

  const storedExpiry = getTokenExpiry()
  const expiresAt = resolveExpiresAt(storedExpiry, payload.exp)

  if (expiresAt && expiresAt <= Date.now()) {
    clearToken()
    return null
  }

  const id = Number(rawUserId)

  if (!Number.isFinite(id)) {
    console.error('Invalid user identifier in token payload')
    clearToken()
    return null
  }

  return {
    id,
    email: String(rawEmail),
    token,
    expiresAt,
  }
}

const persistAuthResponse = (response: AuthResponseDto): SessionUser => {
  setToken(response.token, response.expiresInSeconds)
  const user = getSessionUser()
  if (!user) {
    throw new Error('Unable to establish authenticated session')
  }
  return user
}

export const register = async (payload: RegisterDto): Promise<SessionUser> => {
  const response = await request<AuthResponseDto>('/auth/register', {
    method: 'POST',
    auth: false,
    body: payload,
  })

  return persistAuthResponse(response)
}

export const login = async (payload: LoginDto): Promise<SessionUser> => {
  const response = await request<AuthResponseDto>('/auth/login', {
    method: 'POST',
    auth: false,
    body: payload,
  })

  return persistAuthResponse(response)
}

export const logout = () => {
  clearToken()
}
