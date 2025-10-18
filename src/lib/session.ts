type Listener = (token: string | null) => void

const TOKEN_STORAGE_KEY = 'noteapp:token'
const TOKEN_EXPIRY_STORAGE_KEY = 'noteapp:token-expiry'
const listeners = new Set<Listener>()

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined'

const readToken = () => (isBrowser() ? localStorage.getItem(TOKEN_STORAGE_KEY) : null)

const readExpiry = () => {
  if (!isBrowser()) return null
  const raw = localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY)
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

const notify = (token: string | null) => {
  listeners.forEach((listener) => listener(token))
}

export const getToken = () => readToken()

export const getTokenExpiry = () => readExpiry()

export const setToken = (token: string, expiresInSeconds?: number) => {
  if (!isBrowser()) return
  localStorage.setItem(TOKEN_STORAGE_KEY, token)

  if (typeof expiresInSeconds === 'number' && Number.isFinite(expiresInSeconds)) {
    const expiresAt = Date.now() + expiresInSeconds * 1000
    localStorage.setItem(TOKEN_EXPIRY_STORAGE_KEY, `${expiresAt}`)
  } else {
    localStorage.removeItem(TOKEN_EXPIRY_STORAGE_KEY)
  }

  notify(token)
}

export const clearToken = () => {
  if (!isBrowser()) return
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(TOKEN_EXPIRY_STORAGE_KEY)
  notify(null)
}

export const subscribeToToken = (listener: Listener) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
