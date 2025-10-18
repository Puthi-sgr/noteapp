<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listNotes, createNote as createNoteRequest } from '../lib/api/notes'
import type { Note } from '../lib/api/types'
import type { ApiError } from '../lib/api/types'

const emit = defineEmits<{
  selectNote: [note: Note]
}>()

const notes = ref<Note[]>([])
const showCreateForm = ref(false)
const newNoteTitle = ref('')
const newNoteContent = ref('')
const loading = ref(false)
const error = ref('')

const loadNotes = async () => {
  loading.value = true
  error.value = ''

  try {
    notes.value = await listNotes()
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

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadNotes()
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-pink-700">My Notes</h2>
      <button
        @click="showCreateForm = !showCreateForm"
        class="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg transition-colors"
      >
        {{ showCreateForm ? 'Cancel' : '+ New Note' }}
      </button>
    </div>

    <div v-if="error" class="bg-pink-100 border border-pink-400 text-pink-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <div v-if="showCreateForm" class="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-pink-200">
      <h3 class="text-lg font-semibold text-pink-700 mb-4">Create New Note</h3>
      <form @submit.prevent="createNote" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Title *</label>
          <input
            v-model="newNoteTitle"
            type="text"
            required
            class="w-full px-3 py-2 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="Enter note title"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Content</label>
          <textarea
            v-model="newNoteContent"
            rows="4"
            class="w-full px-3 py-2 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="Enter note content (optional)"
          ></textarea>
        </div>
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          {{ loading ? 'Creating...' : 'Create Note' }}
        </button>
      </form>
    </div>

    <div v-if="loading && notes.length === 0" class="text-center py-8 text-pink-600">
      Loading notes...
    </div>

    <div v-else-if="notes.length === 0" class="text-center py-8 text-gray-500">
      No notes yet. Create your first note!
    </div>

    <div v-else class="space-y-3 overflow-y-auto">
      <div
        v-for="note in notes"
        :key="note.id"
        @click="emit('selectNote', note)"
        class="bg-white rounded-lg shadow-sm hover:shadow-md p-4 cursor-pointer transition-all border-l-4 border-pink-400 hover:border-pink-600"
      >
        <h3 class="font-semibold text-lg text-gray-800 mb-2">{{ note.title }}</h3>
        <p class="text-sm text-gray-600">
          Created: {{ formatDate(note.createdAt) }}
        </p>
        <p v-if="note.updatedAt && note.updatedAt !== note.createdAt" class="text-xs text-pink-600 mt-1">
          Updated: {{ formatDate(note.updatedAt) }}
        </p>
      </div>
    </div>
  </div>
</template>
