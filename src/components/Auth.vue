<script setup lang="ts">
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

const emit = defineEmits<{
  authenticated: []
}>()

const email = ref('')
const password = ref('')
const isSignUp = ref(false)
const loading = ref(false)
const error = ref('')
const successMessage = ref('')

const handleAuth = async () => {
  if (!email.value || !password.value) {
    error.value = 'Email and password are required'
    return
  }

  loading.value = true
  error.value = ''
  successMessage.value = ''

  try {
    if (isSignUp.value) {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.value,
        password: password.value
      })

      if (signUpError) {
        error.value = signUpError.message
      } else {
        successMessage.value = 'Account created successfully! Please sign in.'
        isSignUp.value = false
        password.value = ''
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value
      })

      if (signInError) {
        error.value = signInError.message
      } else {
        emit('authenticated')
      }
    }
  } catch (err) {
    error.value = 'An unexpected error occurred'
    console.error(err)
  }

  loading.value = false
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
      <h1 class="text-3xl font-bold text-pink-700 text-center mb-2">
        Notes App
      </h1>
      <p class="text-gray-600 text-center mb-8">
        {{ isSignUp ? 'Create your account' : 'Sign in to continue' }}
      </p>

      <div v-if="error" class="bg-pink-100 border border-pink-400 text-pink-700 px-4 py-3 rounded mb-4">
        {{ error }}
      </div>

      <div v-if="successMessage" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        {{ successMessage }}
      </div>

      <form @submit.prevent="handleAuth" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full px-4 py-3 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
          <input
            v-model="password"
            type="password"
            required
            minlength="6"
            class="w-full px-4 py-3 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          {{ loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In') }}
        </button>
      </form>

      <div class="mt-6 text-center">
        <button
          @click="isSignUp = !isSignUp; error = ''; successMessage = ''"
          class="text-pink-600 hover:text-pink-800 font-medium transition-colors"
        >
          {{ isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up" }}
        </button>
      </div>
    </div>
  </div>
</template>
