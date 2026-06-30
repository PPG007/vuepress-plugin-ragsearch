export interface Source {
  title: string
  url: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: Source[]
  status: 'streaming' | 'complete' | 'error'
  error?: string
}

export type SSEData =
  | { type: 'text'; content: string }
  | { type: 'source'; content: Source }
  | { type: 'done' }

export interface RAGSearchPluginOptions {
  baseUrl: string
  token: TokenConfig
}

export type TokenConfig =
  | { type: 'literal'; value: string }
  | { type: 'localStorage'; storageKey?: string }
