# vuepress-plugin-ragsearch

VuePress 2 的 RAG 文档搜索与 AI 对话插件。插件会在页面中添加一个搜索按钮和右侧聊天抽屉，并从你自己的 RAG 后端流式接收回答。

本插件不包含后端服务。它只提供 VuePress 客户端界面，以及与 RAG 服务通信所需的 HTTP/SSE 接口约定。

## 安装方法

在 VuePress 2 项目中安装插件：

```bash
pnpm add vuepress-plugin-ragsearch
```

也可以使用 npm 或 Yarn：

```bash
npm install vuepress-plugin-ragsearch
yarn add vuepress-plugin-ragsearch
```

VuePress 和 Vue 是 peer dependencies，请确保你的站点已经安装 VuePress 2 和 Vue 3。

如果是在本仓库中本地开发：

```bash
pnpm install
pnpm run build
pnpm run dev
```

## 使用方法

在 VuePress 配置中启用插件：

```ts
// .vuepress/config.ts
import { defineUserConfig } from "vuepress";
import { ragSearchPlugin } from "vuepress-plugin-ragsearch";

export default defineUserConfig({
  plugins: [
    ragSearchPlugin({
      baseUrl: "https://rag.example.com",
      token: {
        type: "localStorage",
        storageKey: "rag_token",
      },
      topK: 5,
      locale: "zh-CN",
    }),
  ],
});
```

站点加载后，插件会渲染一个 RAG 搜索按钮。用户可以打开抽屉、输入问题，并看到带来源链接的流式回答。

如果 `token.type` 是 `literal`，插件会自动发送配置中的固定 token。如果 `token.type` 是 `localStorage`，用户可以在浏览器中保存 token，插件会从 `localStorage` 读取。

## 可选配置项

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

| 配置项 | 是否必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `baseUrl` | 是 | 无 | RAG 后端基础 URL。插件会向 `${baseUrl}/chat` 发送聊天请求。 |
| `token` | 是 | 无 | Token 来源。`literal` 表示固定 token，`localStorage` 表示使用浏览器本地保存的 token。 |
| `token.value` | `literal` 模式必填 | `""` | 随请求发送的 Bearer token。为空时不会发送 `Authorization` 头。 |
| `token.storageKey` | 否 | `rag_token` | `token.type` 为 `localStorage` 时使用的 `localStorage` key。 |
| `topK` | 否 | `5` | 请求中发送为 `top_k` 的数量值，具体含义由后端决定。 |
| `locale` | 否 | `zh-CN` | 内置界面语言。支持 `zh-CN` 和 `en-US`。 |
| `searchButtonText` | 否 | 对应语言默认值 | 只覆盖搜索按钮文案的快捷配置。 |
| `messages` | 否 | 对应语言默认值 | UI 文案覆盖项，key 与 `RAGSearchMessages` 一致。 |

聊天历史会保存在浏览器的 `rag_chat_history:${baseUrl || "default"}` 中，最多保留 40 条消息。

## 后端的接口 schema

你的后端需要提供一个 SSE 接口：

```http
POST /chat
Content-Type: application/json
Authorization: Bearer <token>
Accept: text/event-stream
```

只有当解析出的 token 非空时，插件才会发送 `Authorization`。

### 请求体

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

`query` 和 `message` 都是用户本次输入的最新问题。`history` 是当前浏览器会话里之前的非空消息。

示例：

```json
{
  "query": "如何配置鉴权？",
  "message": "如何配置鉴权？",
  "history": [
    { "role": "user", "content": "这个插件有什么作用？" },
    { "role": "assistant", "content": "它可以为 VuePress 添加 RAG 搜索。" }
  ],
  "top_k": 5
}
```

### 成功响应

返回 `200 OK`，并设置 `Content-Type: text/event-stream`。

客户端可以解析以下 SSE payload 形式：

```http
data: {"token":"部分回答文本"}

data: {"content":"部分回答文本"}

event: text
data: {"type":"text","content":"部分回答文本"}

data: {"type":"source","content":{"title":"指南","url":"/guide/","hierarchy":["指南"],"anchor":"intro","path":"/guide/"}}

data: {"type":"sources","sources":[{"title":"指南","path":"/guide/","hierarchy":["指南"],"anchor":"intro"}]}

data: {"type":"done"}

data: [DONE]
```

来源对象可以使用 `url` 或 `path`。如果只提供 `path`，插件会把它作为来源链接使用。

### 错误响应

鉴权失败时请返回 `401` 或 `403`。

流式过程中的业务错误可以返回 SSE 错误 payload：

```http
data: {"type":"error","message":"无法检索索引"}
```

其他非 2xx HTTP 响应会在抽屉中显示为请求失败。
