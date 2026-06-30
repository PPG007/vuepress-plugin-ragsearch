import { ref } from 'vue'
import type { ChatMessage, Source, SSEData, RAGSearchPluginOptions } from '../../types'
import { useToken } from './useToken'

export function useChat(options: RAGSearchPluginOptions) {
  const messages = ref<ChatMessage[]>([])
  const isStreaming = ref(false)
  const { getToken, saveToken, needsSetup } = useToken(options)
  let abortController: AbortController | null = null

  function pushUser(text: string): ChatMessage {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      sources: [],
      status: 'complete',
    }
    messages.value.push(msg)
    return msg
  }

  function pushAssistant(): ChatMessage {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      sources: [],
      status: 'streaming',
    }
    messages.value.push(msg)
    return msg
  }

  async function send(text: string) {
    pushUser(text)
    await stream(text)
  }

  async function stream(userMessage: string) {
    const token = getToken()
    if (!token) return

    const assistantMsg = pushAssistant()
    isStreaming.value = true

    try {
      abortController = new AbortController()
      const history = messages.value
        .slice(0, -1)
        .filter(m => m.status === 'complete')
        .map(m => ({ role: m.role, content: m.content }))

      const response = await fetch(`${options.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMessage, history }),
        signal: abortController.signal,
      })

      if (response.status === 401 || response.status === 403) {
        assistantMsg.status = 'error'
        assistantMsg.error = '鉴权失败，请重新配置 Token'
        return
      }
      if (!response.ok) {
        assistantMsg.status = 'error'
        assistantMsg.error = `请求失败 (${response.status})，请重试`
        return
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data: SSEData = JSON.parse(line.slice(6))
            if (data.type === 'text') {
              assistantMsg.content += data.content
            } else if (data.type === 'source') {
              assistantMsg.sources.push(data.content)
            }
          } catch { /* skip malformed JSON */ }
        }
      }

      assistantMsg.status = 'complete'
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      assistantMsg.status = assistantMsg.content ? 'complete' : 'error'
      assistantMsg.error = assistantMsg.content
        ? '连接中断'
        : '无法连接，请检查网络'
    } finally {
      isStreaming.value = false
      abortController = null
    }
  }

  function retry() {
    const last = messages.value[messages.value.length - 1]
    if (!last || last.role !== 'assistant') return
    const prev = messages.value[messages.value.length - 2]
    if (!prev || prev.role !== 'user') return
    messages.value.pop()
    stream(prev.content)
  }

  function stop() {
    abortController?.abort()
  }

  function clear() {
    messages.value = []
  }

  return { messages, isStreaming, send, retry, stop, clear, needsSetup, saveToken }
}
