type DebugEntryPhase = 'request' | 'response' | 'error' | 'token'

export type DebugEntry = {
  id: string
  timestamp: number
  phase: DebugEntryPhase
  label: string
  details?: Record<string, unknown>
}

type DebugListener = (entries: DebugEntry[]) => void

const MAX_ENTRIES = 200
const listeners = new Set<DebugListener>()
let entries: DebugEntry[] = []
let debugEnabledCache: boolean | null = null

const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export const maskToken = (token: string | null | undefined) => {
  if (!token) return ''
  const normalized = token.trim()
  if (!normalized) return ''
  if (normalized.length <= 8) return '*'.repeat(normalized.length)
  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`
}

export const isDebugEnabled = () => {
  if (debugEnabledCache !== null) return debugEnabledCache

  const runtimeFlag = (import.meta.env.VITE_DEBUG_CONSOLE ?? '').toString().toLowerCase()
  debugEnabledCache = import.meta.env.DEV || runtimeFlag === 'true' || runtimeFlag === '1'
  return debugEnabledCache
}

export const addDebugEntry = (entry: Omit<DebugEntry, 'id' | 'timestamp'>) => {
  if (!isDebugEnabled()) return

  const enriched: DebugEntry = {
    id: generateId(),
    timestamp: Date.now(),
    ...entry,
  }

  entries = [...entries.slice(-MAX_ENTRIES + 1), enriched]
  listeners.forEach((listener) => listener(entries))
}

export const subscribeToDebugEntries = (listener: DebugListener) => {
  listeners.add(listener)
  listener(entries)
  return () => {
    listeners.delete(listener)
  }
}

export const clearDebugEntries = () => {
  entries = []
  listeners.forEach((listener) => listener(entries))
}
