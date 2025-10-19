import { clearToken, getToken, getTokenExpiry } from '../session'
import { addDebugEntry, maskToken } from '../debug'
import type { ApiError } from './types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

type ProblemDetails = {
  title?: string
  detail?: string
  instance?: string
  errors?: Record<string, string[] | string>
  message?: string
  type?: string
  [key: string]: unknown
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'We could not process that request. Double-check the information and try again.',
  401: 'Your session has expired. Please sign in again to continue.',
  403: 'You do not have permission to perform that action.',
  404: 'We could not find the requested resource.',
  409: 'That action conflicts with an existing record.',
  422: 'Some fields need attention. Please review the highlights and try again.',
  429: 'Too many requests in a short time. Please wait a moment and retry.',
  500: 'The server ran into a problem. Please try again shortly.',
  502: 'Bad gateway. Please retry in a moment.',
  503: 'The service is temporarily unavailable. Give it another try soon.',
  504: 'The request timed out. Please try again.',
}

const getFirstErrorMessage = (payload: ProblemDetails | null, keys: string[]): string | undefined => {
  if (!payload?.errors) return undefined
  for (const key of keys) {
    const value = payload.errors[key]
    if (!value) continue
    if (Array.isArray(value) && value.length > 0) return String(value[0])
    if (typeof value === 'string' && value.trim()) return value
  }
  return undefined
}

const normalizeRouteKey = (method: string, path: string): string => {
  const upperMethod = method.toUpperCase()
  let pathname: string

  if (path.startsWith('http://') || path.startsWith('https://')) {
    pathname = new URL(path).pathname
  } else {
    pathname = path.startsWith('/') ? path : `/${path}`
  }

  if (pathname.startsWith('/api/')) {
    pathname = pathname.slice(4)
  } else if (pathname === '/api') {
    pathname = '/'
  }

  pathname = pathname.replace(/\/$/, '') || '/'

  if (/^\/notes\/[\w-]+$/i.test(pathname)) {
    pathname = '/notes/:id'
  }

  return `${upperMethod} ${pathname}`
}

const resolveEndpointMessage = (
  routeKey: string,
  status: number,
  payload: ProblemDetails | null
): string | undefined => {
  switch (routeKey) {
    case 'POST /auth/register':
      if (status === 400) {
        const emailError = getFirstErrorMessage(payload, ['Email', 'email'])
        if (emailError) {
          return 'Email already registered.'
        }
        return 'Registration failed. Fix the highlighted fields.'
      }
      if (status === 500) {
        return 'Server error. Please try again.'
      }
      break

    case 'POST /auth/login':
      if (status === 401) return 'Invalid email or password.'
      if (status === 400) return 'Invalid request.'
      break

    case 'GET /notes':
      if (status === 401) return 'Please log in again.'
      if (status === 500) return 'Couldn’t load notes. Try again.'
      break

    case 'GET /notes/:id':
      if (status === 404) return 'Note not found.'
      if (status === 401) return 'Please log in again.'
      break

    case 'POST /notes':
      if (status === 400) {
        const titleError = getFirstErrorMessage(payload, ['Title', 'title'])
        if (titleError) {
          return 'Title is required (max 200 chars).'
        }
        return 'Title is required (max 200 chars).'
      }
      if (status === 401) return 'Please log in again.'
      if (status === 500) return 'Couldn’t create the note.'
      break

    case 'PUT /notes/:id':
      if (status === 400) return 'Title is required (max 200 chars).'
      if (status === 404) return 'Note not found.'
      if (status === 401) return 'Please log in again.'
      if (status === 500) return 'Couldn’t save changes.'
      break

    case 'DELETE /notes/:id':
      if (status === 404) return 'Note not found.'
      if (status === 401) return 'Please log in again.'
      if (status === 500) return 'Couldn’t delete the note.'
      break

    case 'GET /health/db':
      if (status === 500) return 'API can’t reach the database.'
      break
    default:
      break
  }

  return undefined
}

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
      const trimmedToken = token.trim()
      const authorizationValue = /^bearer\s/i.test(trimmedToken)
        ? trimmedToken
        : `Bearer ${trimmedToken}`
      resolvedHeaders.set('Authorization', authorizationValue)
    }
  }

  const method = ((rest.method as string) || 'GET').toUpperCase()
  const routeKey = normalizeRouteKey(method, path)
  const requestLabel = `${method} ${path}`
  const requestUrl = buildUrl(path, query)
  const authHeaderValue = resolvedHeaders.get('Authorization')
  const tokenPreview = authHeaderValue
    ? maskToken(authHeaderValue.replace(/^bearer\s+/i, ''))
    : ''

  addDebugEntry({
    phase: 'request',
    label: requestLabel,
    details: {
      url: requestUrl,
      method,
      authRequired: auth,
      hasAuthorization: Boolean(authHeaderValue),
      tokenPreview: tokenPreview || undefined,
      query: query && Object.keys(query).length > 0 ? query : undefined,
    },
  })

  let response: Response

  try {
    response = await fetch(requestUrl, {
      ...rest,
      headers: resolvedHeaders,
      body: resolvedBody as BodyInit | null | undefined,
    })
  } catch (networkError) {
    addDebugEntry({
      phase: 'error',
      label: requestLabel,
      details: {
        url: requestUrl,
        kind: 'network',
        message: networkError instanceof Error ? networkError.message : String(networkError),
      },
    })
    const error: ApiError = {
      message: 'We could not reach the server. Check your connection and try again.',
      statusCode: 0,
      details: networkError,
    }
    throw error
  }

  if (response.status === 204) {
    return undefined as T
  }

  const payload = await parseBody(response)

  if (!response.ok) {
    if (response.status === 401 && auth) {
      const currentToken = getToken()
      const expiresAt = getTokenExpiry()
      const tokenExpired = typeof expiresAt === 'number' && expiresAt <= Date.now()

      if (!currentToken || tokenExpired) {
        clearToken()
      }
    }

    const payloadObject: ProblemDetails | null = typeof payload === 'object' && payload !== null ? (payload as ProblemDetails) : null
    const customMessage = resolveEndpointMessage(routeKey, response.status, payloadObject)
    const payloadMessage = typeof payload === 'string'
      ? payload.trim()
      : String(payloadObject?.message || payloadObject?.detail || '').trim()
    const fallbackMessage = STATUS_MESSAGES[response.status] || 'Something went wrong. Please try again.'

    const error: ApiError = {
      message: customMessage || payloadMessage || fallbackMessage,
      statusCode: response.status,
      details: typeof payload === 'string' ? undefined : payload,
    }

    addDebugEntry({
      phase: 'error',
      label: requestLabel,
      details: {
        url: requestUrl,
        status: response.status,
        message: error.message,
        tokenPreview: tokenPreview || undefined,
      },
    })

    throw error
  }

  addDebugEntry({
    phase: 'response',
    label: requestLabel,
    details: {
      url: requestUrl,
      status: response.status,
      tokenPreview: tokenPreview || undefined,
    },
  })

  return payload as T
}
