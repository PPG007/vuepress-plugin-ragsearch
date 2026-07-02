import { ref } from 'vue'
import type { RAGSearchPluginOptions } from '../../types'

export function useToken(options: RAGSearchPluginOptions) {
  const needsSetup = ref(false)
  const storageKey = options.token.type === 'localStorage'
    ? (options.token.storageKey || 'rag_token')
    : 'rag_token'

  function getToken(): string {
    if (options.token.type === 'literal') {
      return options.token.value || ''
    }
    try {
      return localStorage.getItem(storageKey) || ''
    } catch {
      return ''
    }
  }

  function saveToken(token: string) {
    try {
      localStorage.setItem(storageKey, token)
      needsSetup.value = false
    } catch {
      // Storage may be unavailable; the user will be prompted again.
    }
  }

  function clearToken() {
    if (options.token.type === 'literal') {
      needsSetup.value = false
      return
    }

    try {
      localStorage.removeItem(storageKey)
    } catch {
      // Ignore unavailable storage.
    }

    needsSetup.value = false
  }

  return { getToken, saveToken, clearToken, needsSetup, storageKey }
}
