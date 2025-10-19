<script setup lang="ts">
import { ref, watch } from 'vue'
import { updateNote as updateNoteRequest, deleteNote as deleteNoteRequest } from '../lib/api/notes'
import type { Note, ApiError } from '../lib/api/types'
import { formatCambodiaDateTime } from '../lib/date'

const props = defineProps<{
  note: Note | null
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const isEditing = ref(false)
const editTitle = ref('')
const editContent = ref('')
const loading = ref(false)
const error = ref('')

watch(() => props.note, (newNote) => {
  if (newNote) {
    editTitle.value = newNote.title
    editContent.value = newNote.content ?? ''
    isEditing.value = false
    error.value = ''
  }
}, { immediate: true })

const updateNote = async () => {
  if (!props.note || !editTitle.value.trim()) {
    error.value = 'Title is required'
    return
  }

  if (editTitle.value.trim().length > 200) {
    error.value = 'Title cannot exceed 200 characters'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const content = editContent.value.trim()
    await updateNoteRequest(props.note.id, {
      title: editTitle.value.trim(),
      content: content || undefined,
    })
    isEditing.value = false
    emit('updated')
  } catch (err) {
    const apiError = err as Partial<ApiError>
    error.value = apiError?.message || 'Failed to update note'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const deleteNote = async () => {
  if (!props.note) return

  if (!confirm('Are you sure you want to delete this note?')) {
    return
  }

  loading.value = true
  error.value = ''

  try {
    await deleteNoteRequest(props.note.id)
    emit('updated')
    emit('close')
  } catch (err) {
    const apiError = err as Partial<ApiError>
    error.value = apiError?.message || 'Failed to delete note'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const formatDate = formatCambodiaDateTime
</script>

<template>
  <div v-if="note" class="note-detail">
    <div class="note-detail__toolbar">
      <div class="note-detail__toolbar-actions">
        <button
          v-if="!isEditing"
          @click="isEditing = true"
          class="note-detail__pill-btn"
        >
          Edit
        </button>
        <button
          @click="deleteNote"
          :disabled="loading"
          class="note-detail__pill-btn note-detail__pill-btn--danger"
        >
          Delete
        </button>
      </div>
    </div>

    <div v-if="error" class="alert alert-error note-detail__status">
      {{ error }}
    </div>

    <div v-if="!isEditing" class="note-detail__viewer">
      <header class="note-detail__header">
        <h1 class="note-detail__title">{{ note.title }}</h1>
      </header>

      <section class="note-detail__content">
        {{ note.content || 'No content' }}
      </section>

      <footer class="note-detail__footer">
        <span class="note-detail__timestamp">
          Created: {{ formatDate(note.createdAt) }}
        </span>
        <span
          v-if="note.updatedAt && note.updatedAt !== note.createdAt"
          class="note-detail__timestamp note-detail__timestamp--accent"
        >
          Updated: {{ formatDate(note.updatedAt) }}
        </span>
      </footer>
    </div>

    <div v-else class="note-detail__editor">
      <h2 class="note-detail__editor-title">Edit Note</h2>

      <form @submit.prevent="updateNote" class="note-detail__form">
        <div class="note-detail__form-field">
          <label class="note-detail__form-label">Title *</label>
          <input
            v-model="editTitle"
            type="text"
            required
            class="glass-input"
            placeholder="Update the title"
          />
        </div>

        <div class="note-detail__form-field">
          <label class="note-detail__form-label">Content</label>
          <textarea
            v-model="editContent"
            rows="10"
            class="glass-input"
            placeholder="Refresh the details"
          ></textarea>
        </div>

  <div class="note-detail__form-actions">
          <button
            type="submit"
            :disabled="loading"
            class="accent-btn w-full"
          >
            {{ loading ? 'Saving...' : 'Save Changes' }}
          </button>
          <button
            type="button"
            @click="isEditing = false; editTitle = note.title; editContent = note.content ?? ''"
            :disabled="loading"
            class="ghost-btn w-full justify-center"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
