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
  <div v-if="loading" class="min-h-screen bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
    <div class="text-pink-600 text-xl">Loading...</div>
  </div>

  <Auth v-else-if="!user" @authenticated="hydrateUser" />

  <div v-else class="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100">
    <header class="bg-white shadow-sm border-b-2 border-pink-300">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-pink-700">Notes App</h1>
        <div class="flex items-center gap-4">
          <span class="text-gray-600 text-sm">{{ user.email }}</span>
          <button
            @click="handleSignOut"
            class="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-160px)]">
        <div class="bg-white rounded-lg shadow-lg p-6 overflow-hidden">
          <NoteList @select-note="handleNoteSelect" :key="noteListRefreshKey" />
        </div>

        <div class="bg-white rounded-lg shadow-lg p-6 overflow-hidden">
          <NoteDetail
            v-if="selectedNote"
            :note="selectedNote"
            @close="handleCloseDetail"
            @updated="handleNoteUpdate"
          />
          <div v-else class="flex items-center justify-center h-full text-gray-400">
            Select a note to view details
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
