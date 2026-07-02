export interface Source {
  title: string;
  url: string;
  hierarchy?: string[];
  anchor?: string;
  path?: string;
}

export interface ChatSource {
  path: string;
  title: string;
  hierarchy: string[];
  anchor: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[];
  status: "streaming" | "complete" | "error";
  phase?: "queued" | "connecting" | "searching" | "answering" | "complete";
  error?: string;
}

export type SSEData =
  | { token: string }
  | { content: string }
  | { type: "text"; content: string }
  | { type: "source"; content: Source | ChatSource }
  | { type: "sources"; sources: ChatSource[] }
  | { type: "done" }
  | { type: "error"; message?: string; error?: string };

export interface RAGSearchPluginOptions {
  baseUrl: string;
  token: TokenConfig;
  topK?: number;
  locale?: RAGSearchLocale;
  themeColor?: string;
  searchButtonText?: string;
  messages?: Partial<RAGSearchMessages>;
}

export type TokenConfig =
  | { type: "literal"; value: string }
  | { type: "localStorage"; storageKey?: string };

export type RAGSearchLocale = "zh-CN" | "en-US";

export interface RAGSearchMessages {
  searchButtonText: string;
  searchButtonTitle: string;
  drawerAriaLabel: string;
  drawerEyebrow: string;
  drawerTitle: string;
  statusStreaming: string;
  statusSavedMessages: string;
  statusHistorySaved: string;
  stopGeneratingTitle: string;
  configureTokenTitle: string;
  clearLocalDataTitle: string;
  closeTitle: string;
  tokenTitle: string;
  tokenDescription: string;
  tokenPlaceholder: string;
  cancel: string;
  save: string;
  clearModalTitle: string;
  clearModalDescription: string;
  clearHistoryLabel: string;
  clearHistoryDescription: string;
  clearTokenLabel: string;
  clearTokenDescription: string;
  confirmClear: string;
  inputPlaceholder: string;
  inputStreamingPlaceholder: string;
  sendTitle: string;
  emptyTitle: string;
  emptyDescription: string;
  phaseError: string;
  phaseComplete: string;
  phaseConnecting: string;
  phaseSearching: string;
  phaseAnswering: string;
  phaseQueued: string;
  userAvatar: string;
  assistantAvatar: string;
  processingLabel: string;
  sourcesLabel: string;
  retry: string;
  scrollToBottomTitle: string;
  copy: string;
  copied: string;
  edit: string;
  regenerate: string;
  saveAndRegenerate: string;
  editQuestionLabel: string;
  authFailed: string;
  requestFailed: string;
  emptyStream: string;
  stopped: string;
  connectionInterrupted: string;
  connectionFailed: string;
  serverError: string;
}
