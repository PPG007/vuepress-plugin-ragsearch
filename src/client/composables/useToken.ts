import { ref } from 'vue'
import type { RAGSearchPluginOptions } from '../../types'

export function useToken(options: RAGSearchPluginOptions) {
  const needsSetup = ref(false)
  const storageKey = options.token.type === 'localStorage'
    ? (options.token.storageKey || 'rag_token')
    : 'rag_token'

  function getToken(): string | null {
    if (options.token.type === 'literal') {
      return options.token.value || null
    }
    try {
      const stored = localStorage.getItem(storageKey)
      if (!stored) {
        needsSetup.value = true
        return null
      }
      return stored
    } catch {
      needsSetup.value = true
      return null
    }
  }

  function saveToken(token: string) {
    try {
      localStorage.setItem(storageKey, token)
      needsSetup.value = false
    } catch {
      // ponytail: storage unavailable, user will be prompted again
    }
  }

  return { getToken, saveToken, needsSetup }
}
