<script setup lang="ts">
import { ref, watch } from 'vue'
import { supabase, type Note } from '../lib/supabase'

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
    editContent.value = newNote.content
    isEditing.value = false
    error.value = ''
  }
}, { immediate: true })

const updateNote = async () => {
  if (!props.note || !editTitle.value.trim()) {
    error.value = 'Title is required'
    return
  }

  loading.value = true
  error.value = ''

  const { error: updateError } = await supabase
    .from('notes')
    .update({
      title: editTitle.value.trim(),
      content: editContent.value.trim()
    })
    .eq('id', props.note.id)

  if (updateError) {
    error.value = 'Failed to update note'
    console.error(updateError)
  } else {
    isEditing.value = false
    emit('updated')
  }

  loading.value = false
}

const deleteNote = async () => {
  if (!props.note) return

  if (!confirm('Are you sure you want to delete this note?')) {
    return
  }

  loading.value = true
  error.value = ''

  const { error: deleteError } = await supabase
    .from('notes')
    .delete()
    .eq('id', props.note.id)

  if (deleteError) {
    error.value = 'Failed to delete note'
    console.error(deleteError)
    loading.value = false
  } else {
    emit('updated')
    emit('close')
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div v-if="note" class="flex flex-col h-full">
    <div class="flex items-center justify-between mb-6">
      <button
        @click="emit('close')"
        class="text-pink-600 hover:text-pink-800 font-medium transition-colors"
      >
        ← Back to Notes
      </button>
      <div class="flex gap-2">
        <button
          v-if="!isEditing"
          @click="isEditing = true"
          class="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Edit
        </button>
        <button
          @click="deleteNote"
          :disabled="loading"
          class="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Delete
        </button>
      </div>
    </div>

    <div v-if="error" class="bg-pink-100 border border-pink-400 text-pink-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <div v-if="!isEditing" class="bg-white rounded-lg shadow-md p-6 overflow-y-auto">
      <h1 class="text-3xl font-bold text-pink-700 mb-4">{{ note.title }}</h1>

      <div class="text-sm text-gray-600 mb-6 space-y-1">
        <p>Created: {{ formatDate(note.created_at) }}</p>
        <p v-if="note.updated_at !== note.created_at" class="text-pink-600">
          Updated: {{ formatDate(note.updated_at) }}
        </p>
      </div>

      <div class="text-gray-800 whitespace-pre-wrap">
        {{ note.content || 'No content' }}
      </div>
    </div>

    <div v-else class="bg-white rounded-lg shadow-md p-6 overflow-y-auto">
      <h2 class="text-2xl font-bold text-pink-700 mb-4">Edit Note</h2>

      <form @submit.prevent="updateNote" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Title *</label>
          <input
            v-model="editTitle"
            type="text"
            required
            class="w-full px-3 py-2 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="Enter note title"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Content</label>
          <textarea
            v-model="editContent"
            rows="12"
            class="w-full px-3 py-2 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="Enter note content"
          ></textarea>
        </div>

        <div class="flex gap-2">
          <button
            type="submit"
            :disabled="loading"
            class="flex-1 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {{ loading ? 'Saving...' : 'Save Changes' }}
          </button>
          <button
            type="button"
            @click="isEditing = false; editTitle = note.title; editContent = note.content"
            :disabled="loading"
            class="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
