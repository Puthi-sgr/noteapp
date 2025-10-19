<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { Note, SessionUser } from './lib/api/types'
import { getSessionUser, logout as logoutUser } from './lib/api/auth'
import { subscribeToToken } from './lib/session'
import Auth from './components/Auth.vue'
import NoteList from './components/NoteList.vue'
import NoteDetail from './components/NoteDetail.vue'
const user = ref<SessionUser | null>(null)
const selectedNote = ref<Note | null>(null)
const loading = ref(true)
const noteListRefreshKey = ref(0)
let unsubscribeFromToken: (() => void) | null = null

const hydrateUser = () => {
  user.value = getSessionUser()
  loading.value = false
}

const triggerNotesRefresh = () => {
  noteListRefreshKey.value += 1
}

const handleSignOut = () => {
  logoutUser()
  selectedNote.value = null
  triggerNotesRefresh()
  hydrateUser()
}

const handleNoteSelect = (note: Note) => {
  selectedNote.value = note
}

const handleNoteUpdate = () => {
  selectedNote.value = null
  triggerNotesRefresh()
}

const handleCloseDetail = () => {
  selectedNote.value = null
}

onMounted(() => {
  hydrateUser()
  unsubscribeFromToken = subscribeToToken(() => {
    hydrateUser()
  })
})

onBeforeUnmount(() => {
  unsubscribeFromToken?.()
})
</script>

<template>
  <div v-if="loading" class="min-h-screen flex items-center justify-center px-4">
    <div class="glass-panel px-6 py-4 text-base font-medium text-[var(--color-text-secondary)]">
      Loading your workspace...
    </div>
  </div>

  <Auth v-else-if="!user" @authenticated="hydrateUser" />

  <div v-else class="app-shell">
    <div class="app-shell__inner">
      <header class="glass-panel app-header">
        <div>
          <p class="uppercase tracking-[0.35em] text-xs text-[var(--color-text-secondary)]">Just write your ideas here</p>
          <h1 class="mt-2 text-3xl font-semibold text-[var(--color-text-primary)] accent-underline">TechBodia Notes</h1>
        </div>
        <div class="flex items-center gap-4 flex-wrap justify-end">
          <span class="accent-chip">{{ user.email }}</span>
          <button @click="handleSignOut" class="ghost-btn">
            Sign Out
          </button>
        </div>
      </header>

      <main class="app-content">
        <section class="glass-panel note-list-shell">
          <NoteList @select-note="handleNoteSelect" :key="noteListRefreshKey" />
        </section>
      </main>
    </div>
  </div>

  <transition name="modal-fade">
    <div
      v-if="selectedNote"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      @click.self="handleCloseDetail"
    >
      <div class="modal-shell">
        <div class="modal-content glass-panel">
          <div class="modal-content__header">
            <button
              type="button"
              class="modal-close-btn"
              aria-label="Close details"
              @click="handleCloseDetail"
            >
              x
            </button>
          </div>
          <NoteDetail
            :note="selectedNote"
            @close="handleCloseDetail"
            @updated="handleNoteUpdate"
          />
        </div>
      </div>
    </div>
  </transition>

</template>
