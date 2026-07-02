import type {
  RAGSearchLocale,
  RAGSearchMessages,
  RAGSearchPluginOptions,
} from "../../types";

export const defaultMessages: Record<RAGSearchLocale, RAGSearchMessages> = {
  "zh-CN": {
    searchButtonText: "RAG 搜索",
    searchButtonTitle: "打开 RAG 搜索",
    drawerAriaLabel: "RAG 搜索面板",
    drawerEyebrow: "文档助手",
    drawerTitle: "RAG 搜索",
    statusStreaming: "正在生成回答",
    statusSavedMessages: "已保存 {count} 条消息",
    statusHistorySaved: "历史会话会自动保存在本地",
    stopGeneratingTitle: "停止生成",
    configureTokenTitle: "配置 Token",
    clearLocalDataTitle: "清理本地数据",
    closeTitle: "关闭",
    tokenTitle: "配置访问 Token",
    tokenDescription: "Token 可以为空；为空时请求不会携带 Authorization。",
    tokenPlaceholder: "可选 Token",
    cancel: "取消",
    save: "保存",
    clearModalTitle: "清理本地数据",
    clearModalDescription: "选择要清理的内容，未选中的数据会保留。",
    clearHistoryLabel: "清空历史会话",
    clearHistoryDescription: "删除本地保存的聊天记录，当前列表也会清空。",
    clearTokenLabel: "清理 Token",
    clearTokenDescription: "只移除 localStorage 中保存的访问 Token。",
    confirmClear: "确认清理",
    inputPlaceholder: "输入你的问题...",
    inputStreamingPlaceholder: "正在生成回答...",
    sendTitle: "发送",
    emptyTitle: "向文档提问",
    emptyDescription: "回答会流式显示，来源和历史会话会保存在本地浏览器。",
    phaseError: "出错了",
    phaseComplete: "已完成",
    phaseConnecting: "连接服务",
    phaseSearching: "检索资料",
    phaseAnswering: "生成回答",
    phaseQueued: "排队中",
    userAvatar: "你",
    assistantAvatar: "AI",
    processingLabel: "正在处理",
    sourcesLabel: "参考来源",
    retry: "重试",
    scrollToBottomTitle: "滚动到底部",
    copy: "复制",
    copied: "已复制",
    edit: "编辑",
    regenerate: "重新生成",
    saveAndRegenerate: "保存并重新生成",
    editQuestionLabel: "编辑问题",
    authFailed: "鉴权失败，请重新配置 Token",
    requestFailed: "请求失败 ({status})，请重试",
    emptyStream: "服务端没有返回流式内容，请重试",
    stopped: "已停止",
    connectionInterrupted: "连接中断",
    connectionFailed: "无法连接，请检查网络",
    serverError: "服务端返回错误",
  },
  "en-US": {
    searchButtonText: "RAG Search",
    searchButtonTitle: "Open RAG search",
    drawerAriaLabel: "RAG search panel",
    drawerEyebrow: "Docs assistant",
    drawerTitle: "RAG Search",
    statusStreaming: "Generating answer",
    statusSavedMessages: "{count} messages saved",
    statusHistorySaved: "Chat history is saved locally",
    stopGeneratingTitle: "Stop generating",
    configureTokenTitle: "Configure token",
    clearLocalDataTitle: "Clear local data",
    closeTitle: "Close",
    tokenTitle: "Configure access token",
    tokenDescription: "The token is optional. Empty tokens omit the Authorization header.",
    tokenPlaceholder: "Optional token",
    cancel: "Cancel",
    save: "Save",
    clearModalTitle: "Clear local data",
    clearModalDescription: "Choose what to clear. Unselected data will be kept.",
    clearHistoryLabel: "Clear chat history",
    clearHistoryDescription: "Delete saved chat history and clear the current list.",
    clearTokenLabel: "Clear token",
    clearTokenDescription: "Only remove the access token saved in localStorage.",
    confirmClear: "Clear",
    inputPlaceholder: "Ask a question...",
    inputStreamingPlaceholder: "Generating answer...",
    sendTitle: "Send",
    emptyTitle: "Ask the docs",
    emptyDescription: "Answers stream in live. Sources and chat history are saved in this browser.",
    phaseError: "Error",
    phaseComplete: "Done",
    phaseConnecting: "Connecting",
    phaseSearching: "Searching",
    phaseAnswering: "Answering",
    phaseQueued: "Queued",
    userAvatar: "You",
    assistantAvatar: "AI",
    processingLabel: "Processing",
    sourcesLabel: "Sources",
    retry: "Retry",
    scrollToBottomTitle: "Scroll to bottom",
    copy: "Copy",
    copied: "Copied",
    edit: "Edit",
    regenerate: "Regenerate",
    saveAndRegenerate: "Save and regenerate",
    editQuestionLabel: "Edit question",
    authFailed: "Authentication failed. Please reconfigure the token.",
    requestFailed: "Request failed ({status}). Please try again.",
    emptyStream: "The server did not return a stream. Please try again.",
    stopped: "Stopped",
    connectionInterrupted: "Connection interrupted",
    connectionFailed: "Unable to connect. Please check your network.",
    serverError: "Server returned an error",
  },
};

export type RAGSearchMessageKey = keyof RAGSearchMessages;

export function useI18n(options: RAGSearchPluginOptions) {
  const messages = resolveMessages(options);

  function t(key: RAGSearchMessageKey, params: Record<string, string | number> = {}) {
    return formatMessage(messages[key], params);
  }

  return { messages, t };
}

export function resolveMessages(options: RAGSearchPluginOptions): RAGSearchMessages {
  const locale = options.locale || "zh-CN";
  const base = defaultMessages[locale] || defaultMessages["zh-CN"];

  return {
    ...base,
    ...options.messages,
    ...(options.searchButtonText ? { searchButtonText: options.searchButtonText } : {}),
  };
}

function formatMessage(message: string, params: Record<string, string | number>) {
  return message.replace(/\{(\w+)\}/g, (_, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : `{${key}}`,
  );
}
