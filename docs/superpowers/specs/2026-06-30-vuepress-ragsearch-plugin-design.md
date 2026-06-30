# VuePress 2 RAG 搜索插件设计

## 概述

一个 VuePress 2 插件，通过右侧抽屉面板提供基于 RAG 的文档搜索和 AI 对话功能。后端 RAG 服务自建，插件只负责前端 UI。

## 交互模式

- 点击导航栏搜索按钮 → 右侧抽屉滑入（宽度 440px，移动端 100vw）
- 抽屉内是纯对话界面：用户提问 → AI 基于文档 RAG 检索后流式回答
- 用户可多轮追问
- 点击遮罩层或路由切换时自动关闭

## API 协议

### POST /chat（SSE 流式）

请求：
```
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "用户消息",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

SSE 响应事件类型：

| type | 含义 | content 字段 |
|------|------|-------------|
| `text` | 增量文本片段，流式渲染 | 文本内容 |
| `source` | 引用来源 | `{ title, url }` |
| `done` | 流结束标记 | 空 |

## 组件结构

```
RAGSearchPlugin (入口)
├── RAGSearchButton.vue      — 导航栏搜索按钮
├── RAGSearchDrawer.vue      — 抽屉容器（遮罩 + 滑入动画）
│   ├── RAGMessageList.vue   — 消息列表（滚动区）
│   │   └── RAGMessage.vue   — 单条消息（用户/AI + 来源引用）
│   ├── RAGInput.vue         — 底部输入框
│   └── RAGTokenInput.vue    — Token 输入界面（localStorage 模式未配时显示）
├── composables/
│   ├── useChat.ts           — 对话状态管理
│   └── useDrawer.ts         — 抽屉开关状态
└── types/
    └── index.ts             — 类型定义
```

## 插件配置

```ts
interface RAGSearchPluginOptions {
  baseUrl: string
  token: {
    type: 'literal' | 'localStorage'
    value?: string          // type=literal 时必填
    storageKey?: string     // type=localStorage 时使用，默认 'rag_token'
  }
}
```

## 数据流

1. 用户输入消息 → useChat 将消息加入列表
2. 发送 POST /chat（SSE），携带当前消息和历史记录
3. 通过 fetch + ReadableStream 解析 SSE
4. `text` 事件 → 增量追加到当前 AI 消息，打字机效果
5. `source` 事件 → 收集来源
6. `done` 事件 → 流结束，合并来源到消息底部，输入框恢复
7. 继续追问 → 回到步骤 1

## 样式规范

- 无第三方组件库依赖
- 配色跟随 VuePress 主题 CSS 变量（`--vp-c-*`）
- 动画仅用 CSS transition（抽屉滑入、打字机光标闪烁）
- Markdown 渲染复用 VuePress 内置 `markdown-it` 实例
- 代码高亮复用 VuePress 内置 Prism.js

## 状态处理

| 场景 | 处理 |
|------|------|
| 首次打开抽屉 | 显示占位文案"基于文档提问，AI 帮你找到答案" |
| 网络断开 / 不可达 | "无法连接，请检查网络" + 重试按钮 |
| SSE 流中断 | 保留已收到内容 + "连接中断"提示 + 重试 |
| Token 无效 (401/403) | "鉴权失败，请重新配置 Token" |
| localStorage Token 不存在 | 抽屉内显示 Token 输入界面 |
| 流进行中 | AI 气泡内闪烁光标，输入框禁用 |
| 用户快速连续发送 | 输入框发送时禁用，响应完成恢复 |
| 路由切换时抽屉打开 | 自动关闭抽屉 |
| 消息过长 | overflow-y:auto，新消息自动滚到底部 |

## 无第三方依赖

所有功能使用 Vue 3 原生能力 + VuePress 已有依赖实现：

- SSE 解析：`fetch` + `ReadableStream` + `TextDecoder`
- 动画：CSS `transition`
- 状态：Vue 3 `ref` / `reactive`
- Markdown：VuePress 内置 `markdown-it`
- 代码高亮：VuePress 内置 Prism.js
