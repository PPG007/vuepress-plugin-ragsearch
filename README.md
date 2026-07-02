# @ppg007/vuepress-plugin-ragsearch

[简体中文](README_zh.md)

VuePress 2 plugin for RAG-powered documentation search and AI chat. The plugin adds a floating search button and a right-side chat drawer, then streams answers from your own RAG backend.

The backend is not bundled. This package only provides the VuePress client UI and the HTTP/SSE contract used to talk to your RAG service.

## Installation

Install the plugin in a VuePress 2 project:

```bash
pnpm add @ppg007/vuepress-plugin-ragsearch
```

With npm or Yarn:

```bash
npm install @ppg007/vuepress-plugin-ragsearch
yarn add @ppg007/vuepress-plugin-ragsearch
```

VuePress and Vue are peer dependencies, so make sure your site already has VuePress 2 and Vue 3 installed.

For local development of this repository:

```bash
pnpm install
pnpm run build
pnpm run dev
```

## Usage

Add the plugin to your VuePress config:

```ts
// .vuepress/config.ts
import { defineUserConfig } from "vuepress";
import { ragSearchPlugin } from "@ppg007/vuepress-plugin-ragsearch";

export default defineUserConfig({
  plugins: [
    ragSearchPlugin({
      baseUrl: "https://rag.example.com",
      token: {
        type: "localStorage",
        storageKey: "rag_token",
      },
      topK: 5,
      locale: "en-US",
    }),
  ],
});
```

When the site loads, the plugin renders a RAG Search button. Users can open the drawer, enter a question, and receive a streamed answer with source links.

If `token.type` is `literal`, the configured token is sent automatically. If `token.type` is `localStorage`, users can save a token in the browser and the plugin will read it from `localStorage`.

## Optional Configuration

```ts
interface RAGSearchPluginOptions {
  baseUrl: string;
  token: TokenConfig;
  topK?: number;
  locale?: "zh-CN" | "en-US";
  searchButtonText?: string;
  messages?: Partial<RAGSearchMessages>;
}

type TokenConfig =
  | { type: "literal"; value: string }
  | { type: "localStorage"; storageKey?: string };
```

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `baseUrl` | Yes | None | Base URL of your RAG backend. The plugin sends chat requests to `${baseUrl}/chat`. |
| `token` | Yes | None | Token source. Use `literal` for a fixed token or `localStorage` for a browser-stored token. |
| `token.value` | For `literal` | `""` | Bearer token sent with requests. Empty values omit the `Authorization` header. |
| `token.storageKey` | No | `rag_token` | `localStorage` key used when `token.type` is `localStorage`. |
| `topK` | No | `5` | Number sent as `top_k` in chat requests. Your backend decides how to use it. |
| `locale` | No | `zh-CN` | Built-in UI language. Supported values are `zh-CN` and `en-US`. |
| `searchButtonText` | No | Locale default | Shortcut for overriding only the search button label. |
| `messages` | No | Locale default | Partial map of UI text overrides. Keys match `RAGSearchMessages`. |

Chat history is saved in the browser under `rag_chat_history:${baseUrl || "default"}` and is capped at 40 messages.

## Backend API Schema

Your backend must expose an SSE endpoint:

```http
POST /chat
Content-Type: application/json
Authorization: Bearer <token>
```

`Authorization` is only sent when the resolved token is not empty.

### Request Body

```ts
interface ChatRequest {
  query: string;
  message: string;
  history: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  top_k: number;
}
```

`query` and `message` both contain the latest user input. `history` contains previous non-empty messages from the current browser conversation.

Example:

```json
{
  "query": "How do I configure authentication?",
  "message": "How do I configure authentication?",
  "history": [
    { "role": "user", "content": "What does this plugin do?" },
    { "role": "assistant", "content": "It adds RAG search to VuePress." }
  ],
  "top_k": 5
}
```

### Successful Response

Return `200 OK` with `Content-Type: text/event-stream`.

The client accepts these SSE payload shapes:

```http
data: {"token":"partial answer text"}

data: {"content":"partial answer text"}

event: text
data: {"type":"text","content":"partial answer text"}

data: {"type":"source","content":{"title":"Guide","url":"/guide/","hierarchy":["Guide"],"anchor":"intro","path":"/guide/"}}

data: {"type":"sources","sources":[{"title":"Guide","path":"/guide/","hierarchy":["Guide"],"anchor":"intro"}]}

data: {"type":"done"}

data: [DONE]
```

Source objects can use either `url` or `path`. If only `path` is provided, the plugin uses it as the source URL.

### Error Response

For authentication failures, return `401` or `403`.

For stream-level errors, return an SSE error payload:

```http
data: {"type":"error","message":"Unable to search the index"}
```

Non-2xx HTTP responses are displayed as request failures in the drawer.
