export interface NoteReadDto {
  id: number
  title: string
  content?: string | null
  createdAt: string
  updatedAt?: string | null
}

export type NoteCreateDto = {
  title: string
  content?: string | null
}

export type NoteUpdateDto = {
  title: string
  content?: string | null
}

export type RegisterDto = {
  email: string
  password: string
}

export type LoginDto = {
  email: string
  password: string
}

export interface AuthResponseDto {
  token: string
  expiresInSeconds: number
}

export interface SessionUser {
  id: number
  email: string
  token: string
  expiresAt: number | null
}

export type Note = NoteReadDto

export interface ApiError {
  message: string
  statusCode: number
  details?: unknown
}
