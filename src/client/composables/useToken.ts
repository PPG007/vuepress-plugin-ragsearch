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
    const stored = localStorage.getItem(storageKey)
    if (!stored) {
      needsSetup.value = true
      return null
    }
    return stored
  }

  function saveToken(token: string) {
    localStorage.setItem(storageKey, token)
    needsSetup.value = false
  }

  return { getToken, saveToken, needsSetup }
}
