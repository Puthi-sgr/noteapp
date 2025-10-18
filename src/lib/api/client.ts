import { clearToken, getToken } from '../session'
import type { ApiError } from './types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

type QueryRecord = Record<string, string | number | boolean | null | undefined>

type RequestConfig = Omit<RequestInit, 'body'> & {
  auth?: boolean
  body?: unknown
  query?: QueryRecord
}

const buildUrl = (path: string, query?: QueryRecord) => {
  const resolvedPath = path.startsWith('/') ? path : `/${path}`
  const url = path.startsWith('http://') || path.startsWith('https://')
    ? new URL(path)
    : new URL(resolvedPath, API_BASE_URL)

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      url.searchParams.set(key, String(value))
    })
  }

  return url.toString()
}

const parseBody = async (response: Response) => {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch (error) {
    return text
  }
}

export const request = async <T>(path: string, config: RequestConfig = {}): Promise<T> => {
  const { auth = true, headers, body, query, ...rest } = config
  const resolvedHeaders = new Headers(headers || {})

  resolvedHeaders.set('Accept', 'application/json')

  let resolvedBody = body
  if (body && !(body instanceof FormData)) {
    resolvedHeaders.set('Content-Type', 'application/json')
    resolvedBody = JSON.stringify(body)
  }

  if (auth) {
    const token = getToken()
    if (token) {
      resolvedHeaders.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(buildUrl(path, query), {
    ...rest,
    headers: resolvedHeaders,
    body: resolvedBody as BodyInit | null | undefined,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const payload = await parseBody(response)

  if (!response.ok) {
    if (response.status === 401) {
      clearToken()
    }

    const error: ApiError = {
      message: typeof payload === 'string' ? payload : payload?.message || 'Request failed',
      statusCode: response.status,
      details: typeof payload === 'string' ? undefined : payload,
    }

    throw error
  }

  return payload as T
}
