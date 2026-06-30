import type { RAGSearchPluginOptions } from '../types'

declare const __RAG_OPTIONS__: string | undefined

const options: RAGSearchPluginOptions = __RAG_OPTIONS__
  ? JSON.parse(__RAG_OPTIONS__)
  : { baseUrl: '', token: { type: 'literal', value: '' } }

export function useOptions(): RAGSearchPluginOptions {
  return options
}
