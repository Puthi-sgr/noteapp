<script setup lang="ts">
import { ref } from 'vue'
import { login, register } from '../lib/api/auth'
import type { ApiError } from '../lib/api/types'

const emit = defineEmits<{
  authenticated: []
}>()

const email = ref('')
const password = ref('')
const isSignUp = ref(false)
const loading = ref(false)
const error = ref('')

const handleAuth = async () => {
  if (!email.value || !password.value) {
    error.value = 'Email and password are required'
    return
  }

  loading.value = true
  error.value = ''

  try {
    if (isSignUp.value) {
      await register({
        email: email.value.trim(),
        password: password.value,
      })
    } else {
      await login({
        email: email.value.trim(),
        password: password.value,
      })
    }
    emit('authenticated')
  } catch (err) {
    const apiError = err as Partial<ApiError>
    error.value = apiError?.message || 'An unexpected error occurred'
    console.error(err)
  }

  loading.value = false
}
</script>

<template>
  <div class="auth-shell">
    <div class="glass-panel auth-card">
      <span class="accent-glow"></span>

      <header class="auth-card__header">
        <h1 class="auth-card__title">TechBodia Notes</h1>
        <p class="auth-card__subtitle">
          {{ isSignUp ? 'Create your account' : 'Sign in to continue' }}
        </p>
      </header>

      <div v-if="error" class="alert alert-error">
        {{ error }}
      </div>

      <form @submit.prevent="handleAuth" class="auth-card__form">
        <div class="auth-card__form-field">
          <label class="text-sm font-medium text-[var(--color-text-secondary)]">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="glass-input"
            placeholder="you@example.com"
          />
        </div>

        <div class="auth-card__form-field">
          <label class="text-sm font-medium text-[var(--color-text-secondary)]">Password</label>
          <input
            v-model="password"
            type="password"
            required
            minlength="6"
            class="glass-input"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="accent-btn w-full"
        >
          {{ loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In') }}
        </button>
      </form>

      <div class="auth-card__toggle">
        <button
          type="button"
          @click="isSignUp = !isSignUp; error = ''"
          class="ghost-btn"
        >
          {{ isSignUp ? 'Already have an account? Sign In' : "Need an account? Sign Up" }}
        </button>
      </div>
    </div>
  </div>
</template>
