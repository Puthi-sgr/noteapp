<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { DebugEntry } from '../lib/debug'
import {
  clearDebugEntries,
  maskToken,
  subscribeToDebugEntries,
} from '../lib/debug'
import {
  getToken,
  getTokenExpiry,
  subscribeToToken,
} from '../lib/session'

const visible = ref(false)
const entries = ref<DebugEntry[]>([])
const currentToken = ref<string | null>(null)
const tokenExpiry = ref<number | null>(null)
let unsubscribeEntries: (() => void) | null = null
let unsubscribeToken: (() => void) | null = null

const toggleConsole = () => {
  visible.value = !visible.value
}

const clearConsole = () => {
  clearDebugEntries()
}

const currentTokenPreview = computed(() => maskToken(currentToken.value))
const currentTokenExpiry = computed(() => {
  if (!tokenExpiry.value) return 'n/a'
  const expiryDate = new Date(tokenExpiry.value)
  if (Number.isNaN(expiryDate.getTime())) return 'Invalid date'
  return `${expiryDate.toLocaleString()} (${expiryDate < new Date() ? 'expired' : 'active'})`
})

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return `${timestamp}`
  return date.toLocaleTimeString()
}

const formatDetails = (details?: Record<string, unknown>) => {
  if (!details) return ''
  try {
    return JSON.stringify(details, null, 2)
  } catch (error) {
    return String(details)
  }
}

onMounted(() => {
  currentToken.value = getToken()
  tokenExpiry.value = getTokenExpiry()

  unsubscribeEntries = subscribeToDebugEntries((nextEntries) => {
    entries.value = [...nextEntries].reverse()
  })

  unsubscribeToken = subscribeToToken((token) => {
    currentToken.value = token
    tokenExpiry.value = getTokenExpiry()
  })
})

onBeforeUnmount(() => {
  unsubscribeEntries?.()
  unsubscribeToken?.()
})
</script>

<template>
  <div class="debug-console">
    <button class="debug-console__toggle" type="button" @click="toggleConsole">
      {{ visible ? 'Hide' : 'Show' }} Debug ({{ entries.length }})
    </button>

    <div v-if="visible" class="debug-console__panel">
      <header class="debug-console__header">
        <h2 class="debug-console__title">Debug Console</h2>
        <div class="debug-console__actions">
          <button type="button" class="debug-console__btn" @click="clearConsole">
            Clear
          </button>
          <button type="button" class="debug-console__btn" @click="toggleConsole">
            Close
          </button>
        </div>
      </header>

      <section class="debug-console__section">
        <h3 class="debug-console__section-title">Token</h3>
        <div class="debug-console__section-body">
          <div><strong>Preview:</strong> {{ currentTokenPreview || 'none' }}</div>
          <div><strong>Expires:</strong> {{ currentTokenExpiry }}</div>
        </div>
      </section>

      <section class="debug-console__section">
        <h3 class="debug-console__section-title">Events</h3>
        <div v-if="entries.length === 0" class="debug-console__empty">
          No debug entries yet.
        </div>
        <ul v-else class="debug-console__list">
          <li v-for="entry in entries" :key="entry.id" class="debug-console__item">
            <div class="debug-console__item-header">
              <span class="debug-console__timestamp">{{ formatTimestamp(entry.timestamp) }}</span>
              <span class="debug-console__phase" :data-phase="entry.phase">{{ entry.phase }}</span>
            </div>
            <div class="debug-console__label">{{ entry.label }}</div>
            <pre v-if="entry.details" class="debug-console__details">{{ formatDetails(entry.details) }}</pre>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.debug-console {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
}

.debug-console__toggle {
  background: rgba(15, 23, 42, 0.85);
  color: #f8fafc;
  border: none;
  border-radius: 999px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.3);
}

.debug-console__panel {
  width: min(22rem, 90vw);
  max-height: 60vh;
  background: rgba(15, 23, 42, 0.95);
  color: #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.35);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.debug-console__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.debug-console__title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.debug-console__actions {
  display: flex;
  gap: 0.5rem;
}

.debug-console__btn {
  background: rgba(241, 245, 249, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: inherit;
  border-radius: 0.5rem;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  cursor: pointer;
}

.debug-console__section {
  background: rgba(148, 163, 184, 0.08);
  border-radius: 0.75rem;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.debug-console__section-title {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(226, 232, 240, 0.8);
}

.debug-console__section-body {
  font-size: 0.8rem;
  display: grid;
  gap: 0.25rem;
}

.debug-console__empty {
  font-size: 0.8rem;
  color: rgba(226, 232, 240, 0.7);
}

.debug-console__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-height: 20rem;
  overflow-y: auto;
}

.debug-console__item {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 0.5rem;
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.debug-console__item-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: rgba(226, 232, 240, 0.65);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.debug-console__phase[data-phase='error'] {
  color: #fca5a5;
}

.debug-console__phase[data-phase='response'] {
  color: #86efac;
}

.debug-console__phase[data-phase='request'] {
  color: #bfdbfe;
}

.debug-console__phase[data-phase='token'] {
  color: #facc15;
}

.debug-console__label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #f8fafc;
}

.debug-console__details {
  background: rgba(15, 23, 42, 0.75);
  padding: 0.5rem;
  border-radius: 0.5rem;
  font-size: 0.7rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}
</style>
