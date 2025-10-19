<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { listNotes, createNote as createNoteRequest } from '../lib/api/notes'
import type { Note } from '../lib/api/types'
import type { ApiError } from '../lib/api/types'
import { getToken, subscribeToToken } from '../lib/session'
import { formatCambodiaDateTime } from '../lib/date'

const emit = defineEmits<{
  selectNote: [note: Note]
}>()

const notes = ref<Note[]>([])
const showCreateForm = ref(false)
const newNoteTitle = ref('')
const newNoteContent = ref('')
const searchTerm = ref('')
const sortDescending = ref(true)
const loading = ref(false)
const error = ref('')
const lastToken = ref<string | null>(null)
let unsubscribeFromToken: (() => void) | null = null
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const sortLabel = computed(() => sortDescending.value ? 'Newest' : 'Oldest')

const loadNotes = async () => {
  const token = getToken()
  if (!token) {
    notes.value = []
    error.value = ''
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''

  try {
    notes.value = await listNotes({
      search: searchTerm.value.trim() || undefined,
      sort: 'createdAt',
      desc: sortDescending.value,
    })
  } catch (err) {
    const apiError = err as Partial<ApiError>
    error.value = apiError?.message || 'Failed to load notes'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const createNote = async () => {
  if (!newNoteTitle.value.trim()) {
    error.value = 'Title is required'
    return
  }

  if (newNoteTitle.value.trim().length > 200) {
    error.value = 'Title cannot exceed 200 characters'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const content = newNoteContent.value.trim()
    await createNoteRequest({
      title: newNoteTitle.value.trim(),
      content: content || undefined,
    })
    newNoteTitle.value = ''
    newNoteContent.value = ''
    showCreateForm.value = false
    await loadNotes()
  } catch (err) {
    const apiError = err as Partial<ApiError>
    error.value = apiError?.message || 'Failed to create note'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleTokenChange = (token: string | null) => {
  if (!token) {
    lastToken.value = null
    notes.value = []
    error.value = ''
    return
  }

  if (token === lastToken.value) {
    return
  }

  lastToken.value = token
  loadNotes()
}

watch(sortDescending, () => {
  loadNotes()
})

watch(searchTerm, () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    searchTimeout = null
    loadNotes()
  }, 300)
})

onMounted(() => {
  handleTokenChange(getToken())
  unsubscribeFromToken = subscribeToToken(handleTokenChange)
})

onBeforeUnmount(() => {
  unsubscribeFromToken?.()
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="note-list__heading">
      <p class="text-xs uppercase tracking-[0.35em] text-[var(--color-text-secondary)]">Library</p>
      <h2 class="text-2xl font-semibold text-[var(--color-text-primary)]">My Notes</h2>
    </div>

    <div class="note-list__actions">
      <button
        type="button"
        @click="showCreateForm = !showCreateForm"
        class="accent-btn note-list__new-btn"
      >
        <span v-if="!showCreateForm" class="note-list__new-icon" aria-hidden="true">+</span>
        <span>{{ showCreateForm ? 'Cancel' : 'New Note' }}</span>
      </button>
      <div class="note-list__filters">
        <div class="note-list__search">
          <input
            v-model="searchTerm"
            type="search"
            class="note-list__search-input"
            placeholder="Search notes..."
            aria-label="Search notes"
          />
        </div>
        <button
          type="button"
          class="note-list__sort-btn"
          @click="sortDescending = !sortDescending"
          :aria-pressed="sortDescending"
          aria-label="Toggle sort order"
        >
          Sort: {{ sortLabel }}
        </button>
      </div>
    </div>

    <div v-if="showCreateForm" class="glass-panel note-create__panel">
      <h3 class="note-create__title text-[var(--color-text-primary)]">Create New Note</h3>
      <form @submit.prevent="createNote" class="note-create__form">
        <div class="note-create__field">
          <label class="note-create__label text-[var(--color-text-secondary)]">Title *</label>
          <input
            v-model="newNoteTitle"
            type="text"
            required
            class="glass-input"
            placeholder="Give your note a headline"
          />
        </div>
        <div class="note-create__field">
          <label class="note-create__label text-[var(--color-text-secondary)]">Content</label>
          <textarea
            v-model="newNoteContent"
            rows="4"
            class="glass-input"
            placeholder="Capture a thought (optional)"
          ></textarea>
        </div>
        <button
          type="submit"
          :disabled="loading"
          class="accent-btn w-full"
        >
          {{ loading ? 'Creating...' : 'Create Note' }}
        </button>
      </form>
    </div>

  <section class="glass-panel note-list__container">
      <template v-if="error">
        <div class="alert alert-error note-list__status">{{ error }}</div>
      </template>

      <template v-else-if="loading && notes.length === 0">
        <div class="alert alert-info note-list__status text-center">Loading your notes...</div>
      </template>

      <template v-else-if="notes.length === 0">
        <div class="alert alert-info note-list__status text-center">
          {{ searchTerm.trim() ? 'No notes match your search yet.' : 'No notes yet. Start by crafting your first idea!' }}
        </div>
      </template>

      <template v-else>
        <div class="note-list__items">
          <button
            v-for="note in notes"
            :key="note.id"
            type="button"
            @click="emit('selectNote', note)"
            class="note-item"
          >
            <span class="note-item__title">{{ note.title }}</span>
            <span class="note-item__meta">Created: {{ formatCambodiaDateTime(note.createdAt) }}</span>
            <span
              v-if="note.updatedAt && note.updatedAt !== note.createdAt"
              class="note-item__meta note-item__meta--accent"
            >
              Updated: {{ formatCambodiaDateTime(note.updatedAt) }}
            </span>
          </button>
        </div>
      </template>
    </section>
  </div>
</template>
