# VuePress 2 RAG 搜索插件实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一个 VuePress 2 插件，通过右侧抽屉提供基于 RAG 的文档搜索和 AI 对话功能。

**Architecture:** 12 个文件，纯 Vue 3 + VuePress 2 原生能力，无第三方 UI 依赖。Plugin 入口定义编译时常量，Client 入口注册组件。Drawer 通过 `rootComponents` 渲染，按钮通过 CSS fixed 定位在页面右上角。聊天状态、SSE 流解析、Token 管理各自为独立 composable。

**Tech Stack:** Vue 3, VuePress 2, TypeScript, CSS variables, fetch + ReadableStream (SSE)

---

## 文件清单

| 文件 | 职责 |
|------|------|
| `package.json` | 包名、版本、依赖 |
| `tsconfig.json` | TS 编译配置 |
| `src/types/index.ts` | 所有类型定义 |
| `src/node/index.ts` | Plugin 入口，定义 `__RAG_OPTIONS__` |
| `src/client/options.ts` | 从 `__RAG_OPTIONS__` 读取并导出配置 |
| `src/client/config.ts` | `defineClientConfig`，注册 rootComponents |
| `src/client/composables/useToken.ts` | Token 解析（literal / localStorage） |
| `src/client/composables/useChat.ts` | 消息列表、SSE 流发送与解析、重试 |
| `src/client/composables/useDrawer.ts` | 抽屉开关状态、路由监听 |
| `src/client/components/RAGMessage.vue` | 单条消息气泡（用户/AI） |
| `src/client/components/RAGMessageList.vue` | 消息列表容器（滚动、空状态、错误） |
| `src/client/components/RAGInput.vue` | 底部输入框 |
| `src/client/components/RAGTokenSetup.vue` | Token 配置界面 |
| `src/client/components/RAGDrawer.vue` | 抽屉（遮罩 + 滑入面板） |
| `src/client/components/RAGSearch.vue` | 根组件（按钮 + 抽屉） |

---

### Task 1: 项目脚手架

**Files:**
- Create: `package.json`, `tsconfig.json`, `src/types/index.ts`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "vuepress-plugin-ragsearch",
  "version": "0.1.0",
  "description": "VuePress 2 plugin for RAG-powered documentation search and AI chat",
  "keywords": ["vuepress", "plugin", "rag", "search", "ai"],
  "license": "MIT",
  "type": "module",
  "exports": {
    ".": "./src/node/index.ts",
    "./client": "./src/client/config.ts"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "vuepress dev demo",
    "demo:build": "vuepress build demo"
  },
  "peerDependencies": {
    "vue": "^3.4.0",
    "vuepress": "^2.0.0-rc.0"
  },
  "dependencies": {
    "markdown-it": "^14.1.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/markdown-it": "^14.1.0",
    "@vuepress/bundler-vite": "^2.0.0-rc.0",
    "@vuepress/theme-default": "^2.0.0-rc.0",
    "vuepress": "^2.0.0-rc.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "lib",
    "rootDir": "src",
    "declaration": true,
    "paths": {
      "@vuepress/client": ["./node_modules/vuepress/client"],
      "vue": ["./node_modules/vue"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 创建类型定义**

```ts
// src/types/index.ts

export interface Source {
  title: string
  url: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  status: 'streaming' | 'complete' | 'error'
  error?: string
}

export interface SSEData {
  type: 'text' | 'source' | 'done'
  content: string | Source
}

export interface RAGSearchPluginOptions {
  baseUrl: string
  token: TokenConfig
}

export type TokenConfig =
  | { type: 'literal'; value: string }
  | { type: 'localStorage'; storageKey?: string }
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: project scaffolding with types"
```

---

### Task 2: Plugin 入口 + 共享配置

**Files:**
- Create: `src/node/index.ts`, `src/client/options.ts`, `src/client/config.ts`

- [ ] **Step 1: 创建 node 端插件入口**

```ts
// src/node/index.ts
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vuepress'
import type { RAGSearchPluginOptions } from '../types'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export const ragSearchPlugin = (options: RAGSearchPluginOptions): Plugin => {
  return {
    name: 'vuepress-plugin-ragsearch',
    define: {
      __RAG_OPTIONS__: JSON.stringify(options),
    },
    clientConfigFile: path.resolve(__dirname, '../client/config.ts'),
  }
}
```

- [ ] **Step 2: 创建 client 端 options 读取模块**

```ts
// src/client/options.ts
import type { RAGSearchPluginOptions } from '../types'

// __RAG_OPTIONS__ 由插件 define 注入，编译时替换为 JSON 字符串
declare const __RAG_OPTIONS__: string | undefined

const options: RAGSearchPluginOptions = __RAG_OPTIONS__
  ? JSON.parse(__RAG_OPTIONS__)
  : { baseUrl: '', token: { type: 'literal', value: '' } }

export function useOptions(): RAGSearchPluginOptions {
  return options
}
```

- [ ] **Step 3: 创建 client config**

```ts
// src/client/config.ts
import { defineClientConfig } from '@vuepress/client'
import RAGSearch from './components/RAGSearch.vue'

export default defineClientConfig({
  rootComponents: [RAGSearch],
})
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: plugin entry with options and client config"
```

---

### Task 3: useToken composable

**Files:**
- Create: `src/client/composables/useToken.ts`

- [ ] **Step 1: 实现 useToken**

```ts
// src/client/composables/useToken.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: useToken composable"
```

---

### Task 4: useChat composable

**Files:**
- Create: `src/client/composables/useChat.ts`

- [ ] **Step 1: 实现 useChat**

```ts
// src/client/composables/useChat.ts
import { ref } from 'vue'
import type { ChatMessage, Source, RAGSearchPluginOptions } from '../../types'
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
            const data = JSON.parse(line.slice(6))
            if (data.type === 'text') {
              assistantMsg.content += data.content as string
            } else if (data.type === 'source') {
              assistantMsg.sources!.push(data.content as Source)
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
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: useChat composable with SSE streaming"
```

---

### Task 5: useDrawer composable

**Files:**
- Create: `src/client/composables/useDrawer.ts`

- [ ] **Step 1: 实现 useDrawer**

```ts
// src/client/composables/useDrawer.ts
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vuepress/client'

export function useDrawer() {
  const isOpen = ref(false)

  function open() { isOpen.value = true }
  function close() { isOpen.value = false }
  function toggle() { isOpen.value = !isOpen.value }

  // Close drawer on route change
  let router: ReturnType<typeof useRouter> | null = null
  try { router = useRouter() } catch { /* no router in SSR */ }

  let unregister: (() => void) | undefined

  onMounted(() => {
    if (router) {
      unregister = router.afterEach(() => close())
    }
  })

  onUnmounted(() => {
    unregister?.()
  })

  // Close on Escape key
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen.value) close()
  }

  onMounted(() => document.addEventListener('keydown', onKeydown))
  onUnmounted(() => document.removeEventListener('keydown', onKeydown))

  return { isOpen, open, close, toggle }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: useDrawer composable with route and keyboard handling"
```

---

### Task 6: RAGMessage + RAGMessageList 组件

**Files:**
- Create: `src/client/components/RAGMessage.vue`, `src/client/components/RAGMessageList.vue`

- [ ] **Step 1: 创建 RAGMessage.vue**

```vue
<!-- src/client/components/RAGMessage.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import type { ChatMessage } from '../../types'

const props = defineProps<{ message: ChatMessage }>()

const md = new MarkdownIt({ breaks: true, linkify: true })
const rendered = computed(() => props.message.content ? md.render(props.message.content) : '&nbsp;')
</script>

<template>
  <div class="rag-msg" :class="[`rag-msg--${message.role}`, `rag-msg--${message.status}`]">
    <div class="rag-msg__avatar">
      {{ message.role === 'user' ? '🧑' : '🤖' }}
    </div>
    <div class="rag-msg__body">
      <div class="rag-msg__content" v-html="rendered" />
      <div v-if="message.status === 'streaming'" class="rag-msg__cursor">|</div>
      <div v-if="message.sources?.length" class="rag-msg__sources">
        <span class="rag-msg__sources-label">参考：</span>
        <a
          v-for="(s, i) in message.sources"
          :key="i"
          :href="s.url"
          class="rag-msg__source-link"
        >{{ s.title }}</a>
      </div>
      <div v-if="message.status === 'error'" class="rag-msg__error">
        {{ message.error }}
        <button class="rag-msg__retry" @click="$emit('retry')">重试</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rag-msg { display: flex; gap: 8px; padding: 12px 16px; }
.rag-msg--user { flex-direction: row-reverse; }
.rag-msg__avatar { flex-shrink: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--vp-c-bg-soft); font-size: 16px; }
.rag-msg--user .rag-msg__body { align-items: flex-end; }
.rag-msg__body { display: flex; flex-direction: column; max-width: 85%; }
.rag-msg__content {
  padding: 8px 14px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}
.rag-msg--user .rag-msg__content {
  background: var(--vp-c-brand);
  color: var(--vp-c-white);
  border-bottom-right-radius: 4px;
}
.rag-msg--assistant .rag-msg__content {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border-bottom-left-radius: 4px;
}
.rag-msg__cursor {
  display: inline;
  animation: rag-blink 1s step-end infinite;
  font-weight: bold;
  color: var(--vp-c-brand);
}
@keyframes rag-blink { 50% { opacity: 0; } }
.rag-msg__sources { margin-top: 6px; font-size: 12px; color: var(--vp-c-text-2); }
.rag-msg__source-link { margin-left: 4px; color: var(--vp-c-brand); text-decoration: none; }
.rag-msg__source-link:hover { text-decoration: underline; }
.rag-msg__error { margin-top: 6px; font-size: 12px; color: var(--vp-c-danger); }
.rag-msg__retry { margin-left: 8px; padding: 2px 8px; border: 1px solid var(--vp-c-danger); border-radius: 4px; background: none; color: var(--vp-c-danger); cursor: pointer; font-size: 12px; }
.rag-msg__retry:hover { background: var(--vp-c-danger); color: var(--vp-c-white); }
</style>
```

- [ ] **Step 2: 创建 RAGMessageList.vue**

```vue
<!-- src/client/components/RAGMessageList.vue -->
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { ChatMessage } from '../../types'
import RAGMessage from './RAGMessage.vue'

const props = defineProps<{
  messages: ChatMessage[]
}>()

defineEmits<{ retry: [] }>()

const listRef = ref<HTMLElement | null>(null)

watch(
  () => props.messages.length,
  async () => { await nextTick(); listRef.value?.scrollTo({ top: listRef.value.scrollHeight, behavior: 'smooth' }) }
)

watch(
  () => props.messages[props.messages.length - 1]?.content,
  async () => { await nextTick(); listRef.value?.scrollTo({ top: listRef.value.scrollHeight, behavior: 'auto' }) }
)
</script>

<template>
  <div ref="listRef" class="rag-list">
    <div v-if="messages.length === 0" class="rag-list__empty">
      基于文档提问，AI 帮你找到答案
    </div>
    <RAGMessage
      v-for="msg in messages"
      :key="msg.id"
      :message="msg"
      @retry="$emit('retry')"
    />
  </div>
</template>

<style scoped>
.rag-list { flex: 1; overflow-y: auto; padding: 8px 0; }
.rag-list__empty { text-align: center; padding: 60px 24px; color: var(--vp-c-text-2); font-size: 14px; }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: RAGMessage and RAGMessageList components"
```

---

### Task 7: RAGInput + RAGTokenSetup 组件

**Files:**
- Create: `src/client/components/RAGInput.vue`, `src/client/components/RAGTokenSetup.vue`

- [ ] **Step 1: 创建 RAGInput.vue**

```vue
<!-- src/client/components/RAGInput.vue -->
<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  disabled: boolean
}>()

const emit = defineEmits<{
  send: [text: string]
}>()

const text = ref('')

function onSubmit() {
  const trimmed = text.value.trim()
  if (!trimmed || props.disabled) return
  emit('send', trimmed)
  text.value = ''
}
</script>

<template>
  <form class="rag-input" @submit.prevent="onSubmit">
    <textarea
      v-model="text"
      class="rag-input__textarea"
      :disabled="disabled"
      placeholder="输入你的问题..."
      rows="1"
      @keydown.enter.exact.prevent="onSubmit"
    />
    <button
      class="rag-input__btn"
      :disabled="disabled || !text.trim()"
      type="submit"
    >发送</button>
  </form>
</template>

<style scoped>
.rag-input { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--vp-c-divider); }
.rag-input__textarea {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 14px;
  resize: none;
  outline: none;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: inherit;
}
.rag-input__textarea:focus { border-color: var(--vp-c-brand); }
.rag-input__btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: var(--vp-c-brand);
  color: var(--vp-c-white);
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
}
.rag-input__btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
```

- [ ] **Step 2: 创建 RAGTokenSetup.vue**

```vue
<!-- src/client/components/RAGTokenSetup.vue -->
<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  save: [token: string]
}>()

const token = ref('')

function onSave() {
  const trimmed = token.value.trim()
  if (!trimmed) return
  emit('save', trimmed)
}
</script>

<template>
  <div class="rag-token-setup">
    <div class="rag-token-setup__icon">🔑</div>
    <h3>配置访问 Token</h3>
    <p class="rag-token-setup__desc">请输入 RAG 后端的访问 Token</p>
    <form @submit.prevent="onSave">
      <input
        v-model="token"
        class="rag-token-setup__input"
        type="password"
        placeholder="请输入 Token"
      />
      <button
        class="rag-token-setup__btn"
        :disabled="!token.trim()"
        type="submit"
      >确认</button>
    </form>
  </div>
</template>

<style scoped>
.rag-token-setup { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 40px 24px; text-align: center; }
.rag-token-setup__icon { font-size: 48px; margin-bottom: 16px; }
.rag-token-setup h3 { font-size: 16px; margin-bottom: 8px; color: var(--vp-c-text-1); }
.rag-token-setup__desc { font-size: 13px; color: var(--vp-c-text-2); margin-bottom: 20px; }
.rag-token-setup__input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  margin-bottom: 12px;
}
.rag-token-setup__input:focus { border-color: var(--vp-c-brand); }
.rag-token-setup__btn {
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 8px;
  background: var(--vp-c-brand);
  color: var(--vp-c-white);
  font-size: 14px;
  cursor: pointer;
}
.rag-token-setup__btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: RAGInput and RAGTokenSetup components"
```

---

### Task 8: RAGDrawer 组件

**Files:**
- Create: `src/client/components/RAGDrawer.vue`

- [ ] **Step 1: 创建 RAGDrawer.vue**

```vue
<!-- src/client/components/RAGDrawer.vue -->
<script setup lang="ts">
import { useOptions } from '../options'
import { useDrawer } from '../composables/useDrawer'
import { useChat } from '../composables/useChat'
import RAGMessageList from './RAGMessageList.vue'
import RAGInput from './RAGInput.vue'
import RAGTokenSetup from './RAGTokenSetup.vue'

const options = useOptions()
const { isOpen, close } = useDrawer()
const chat = useChat(options)
</script>

<template>
  <Teleport to="body">
    <Transition name="rag-drawer-fade">
      <div v-if="isOpen" class="rag-overlay" @click.self="close">
        <Transition name="rag-drawer-slide">
          <div v-if="isOpen" class="rag-drawer">
            <!-- Header -->
            <div class="rag-drawer__header">
              <span class="rag-drawer__title">RAG 搜索</span>
              <button class="rag-drawer__close" @click="close">✕</button>
            </div>

            <!-- Body: Token setup or Chat -->
            <RAGTokenSetup
              v-if="chat.needsSetup.value"
              @save="chat.saveToken($event)"
            />
            <template v-else>
              <RAGMessageList
                :messages="chat.messages.value"
                @retry="chat.retry()"
              />
              <RAGInput
                :disabled="chat.isStreaming.value"
                @send="chat.send($event)"
              />
            </template>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.rag-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.3);
}
.rag-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 440px;
  max-width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
}
.rag-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--vp-c-divider);
}
.rag-drawer__title { font-size: 15px; font-weight: 600; color: var(--vp-c-text-1); }
.rag-drawer__close {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border: none; border-radius: 6px;
  background: none; color: var(--vp-c-text-2);
  font-size: 16px; cursor: pointer;
}
.rag-drawer__close:hover { background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); }

/* Transitions */
.rag-drawer-fade-enter-active,
.rag-drawer-fade-leave-active { transition: opacity 0.25s ease; }
.rag-drawer-fade-enter-from,
.rag-drawer-fade-leave-to { opacity: 0; }

.rag-drawer-slide-enter-active,
.rag-drawer-slide-leave-active { transition: transform 0.3s ease; }
.rag-drawer-slide-enter-from,
.rag-drawer-slide-leave-to { transform: translateX(100%); }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: RAGDrawer component with transitions"
```

---

### Task 9: RAGSearch 根组件

**Files:**
- Create: `src/client/components/RAGSearch.vue`

- [ ] **Step 1: 创建 RAGSearch.vue**

```vue
<!-- src/client/components/RAGSearch.vue -->
<script setup lang="ts">
import { useDrawer } from '../composables/useDrawer'
import RAGDrawer from './RAGDrawer.vue'

const { isOpen, open } = useDrawer()
</script>

<template>
  <button class="rag-search-btn" :class="{ 'rag-search-btn--hidden': isOpen }" @click="open" title="RAG 搜索">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
    <span class="rag-search-btn__text">搜索</span>
  </button>
  <RAGDrawer />
</template>

<style scoped>
.rag-search-btn {
  position: fixed;
  top: 14px;
  right: 20px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}
.rag-search-btn:hover { color: var(--vp-c-brand); border-color: var(--vp-c-brand); }
.rag-search-btn--hidden { opacity: 0; pointer-events: none; }
.rag-search-btn__text { white-space: nowrap; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: RAGSearch root component with fixed button"
```

---

### Task 10: Demo 站点验证

**Files:**
- Create: `demo/.vuepress/config.ts`, `demo/README.md`

- [ ] **Step 1: 创建 demo 站点配置文件**

```ts
// demo/.vuepress/config.ts
import { defineUserConfig } from 'vuepress'
import { defaultTheme } from '@vuepress/theme-default'
import { viteBundler } from '@vuepress/bundler-vite'
import { ragSearchPlugin } from '../../src/node'

export default defineUserConfig({
  lang: 'zh-CN',
  title: 'RAG Search Demo',
  description: 'VuePress RAG 搜索插件演示',
  bundler: viteBundler(),
  theme: defaultTheme(),
  plugins: [
    ragSearchPlugin({
      baseUrl: 'http://localhost:8080',
      token: {
        type: 'localStorage',
        storageKey: 'rag_token',
      },
    }),
  ],
})
```

- [ ] **Step 2: 创建 demo 首页**

```md
<!-- demo/README.md -->
# RAG Search Demo

这是 VuePress RAG 搜索插件的演示页面。

点击右上角的"搜索"按钮打开 RAG 搜索抽屉。
```

- [ ] **Step 3: 安装依赖并启动 demo**

```bash
pnpm install
pnpm exec vuepress dev demo
```

打开 http://localhost:8080 ，点击右上角搜索按钮，验证抽屉滑入动画、Token 配置界面、对话功能。

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add demo site"
```
