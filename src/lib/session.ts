import { addDebugEntry, maskToken } from './debug'

type Listener = (token: string | null) => void

const TOKEN_STORAGE_KEY = 'noteapp:token'
const TOKEN_EXPIRY_STORAGE_KEY = 'noteapp:token-expiry'
const listeners = new Set<Listener>()

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined'

let cachedToken: string | null = null
let cachedExpiry: number | null = null

const syncCacheFromStorage = () => {
  if (!isBrowser()) return
  cachedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
  const raw = localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY)
  if (raw) {
    const parsed = Number(raw)
    cachedExpiry = Number.isFinite(parsed) ? parsed : null
  } else {
    cachedExpiry = null
  }
}

if (isBrowser()) {
  syncCacheFromStorage()
  window.addEventListener('storage', (event) => {
    if (event.key === TOKEN_STORAGE_KEY || event.key === TOKEN_EXPIRY_STORAGE_KEY) {
      syncCacheFromStorage()
      notify(cachedToken)
    }
  })
}

const notify = (token: string | null) => {
  listeners.forEach((listener) => listener(token))
}

export const getToken = () => {
  if (!isBrowser()) return null
  if (cachedToken === null) {
    syncCacheFromStorage()
  }
  return cachedToken
}

export const getTokenExpiry = () => {
  if (!isBrowser()) return null
  if (cachedExpiry === null) {
    syncCacheFromStorage()
  }
  return cachedExpiry
}

export const setToken = (token: string, expiresInSeconds?: number) => {
  if (!isBrowser()) return
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(TOKEN_EXPIRY_STORAGE_KEY)
  localStorage.setItem(TOKEN_STORAGE_KEY, token)

  cachedToken = token

  if (typeof expiresInSeconds === 'number' && Number.isFinite(expiresInSeconds)) {
    const expiresAt = Date.now() + expiresInSeconds * 1000
    localStorage.setItem(TOKEN_EXPIRY_STORAGE_KEY, `${expiresAt}`)
    cachedExpiry = expiresAt
    addDebugEntry({
      phase: 'token',
      label: 'Token stored',
      details: {
        tokenPreview: maskToken(token),
        expiresAt,
      },
    })
  } else {
    localStorage.removeItem(TOKEN_EXPIRY_STORAGE_KEY)
    cachedExpiry = null
    addDebugEntry({
      phase: 'token',
      label: 'Token stored (no expiry)',
      details: {
        tokenPreview: maskToken(token),
      },
    })
  }

  notify(token)
}

export const clearToken = () => {
  if (!isBrowser()) return
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(TOKEN_EXPIRY_STORAGE_KEY)
  cachedToken = null
  cachedExpiry = null
  addDebugEntry({
    phase: 'token',
    label: 'Token cleared',
  })
  notify(null)
}

export const subscribeToToken = (listener: Listener) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
