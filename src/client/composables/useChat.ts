import { ref, watch } from "vue";
import type {
  ChatMessage,
  ChatSource,
  Source,
  SSEData,
  RAGSearchPluginOptions,
} from "../../types";
import { useI18n } from "./useI18n";
import { useToken } from "./useToken";

const DEFAULT_TOP_K = 5;
const HISTORY_LIMIT = 40;

type RequestHistoryMessage = Pick<ChatMessage, "role" | "content">;

export function useChat(options: RAGSearchPluginOptions) {
  const historyStorageKey = createHistoryStorageKey(options);
  const messages = ref<ChatMessage[]>(loadHistory(historyStorageKey));
  const isStreaming = ref(false);
  const { getToken, saveToken, clearToken, needsSetup } = useToken(options);
  const { t } = useI18n(options);
  let abortController: AbortController | null = null;
  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  getToken();

  watch(
    messages,
    () => {
      if (persistTimer) clearTimeout(persistTimer);
      persistTimer = setTimeout(() => persistHistory(historyStorageKey, messages.value), 120);
    },
    { deep: true },
  );

  function pushUser(text: string): ChatMessage {
    return appendMessage({
      id: createId(),
      role: "user",
      content: text,
      sources: [],
      status: "complete",
      phase: "complete",
    });
  }

  function pushAssistant(): ChatMessage {
    return appendMessage({
      id: createId(),
      role: "assistant",
      content: "",
      sources: [],
      status: "streaming",
      phase: "queued",
    });
  }

  function appendMessage(message: ChatMessage): ChatMessage {
    messages.value.push(message);
    trimHistory();
    return messages.value[messages.value.length - 1];
  }

  async function send(text: string) {
    abortController?.abort();
    pushUser(text);
    await stream(text);
  }

  async function stream(userMessage: string) {
    const token = getToken();

    const requestHistory = createRequestHistory();
    const assistantMsg = pushAssistant();
    isStreaming.value = true;

    try {
      abortController = new AbortController();
      assistantMsg.phase = "connecting";

      const response = await fetch(`${options.baseUrl}/chat`, {
        method: "POST",
        headers: createRequestHeaders(token),
        body: JSON.stringify({
          query: userMessage,
          message: userMessage,
          history: requestHistory,
          top_k: options.topK ?? DEFAULT_TOP_K,
        }),
        signal: abortController.signal,
      });

      if (response.status === 401 || response.status === 403) {
        assistantMsg.status = "error";
        assistantMsg.phase = "complete";
        assistantMsg.error = t("authFailed");
        return;
      }

      if (!response.ok) {
        assistantMsg.status = "error";
        assistantMsg.phase = "complete";
        assistantMsg.error = t("requestFailed", { status: response.status });
        return;
      }

      if (!response.body) {
        assistantMsg.status = "error";
        assistantMsg.phase = "complete";
        assistantMsg.error = t("emptyStream");
        return;
      }

      assistantMsg.phase = "searching";
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        buffer = processSSEBuffer(buffer, assistantMsg, t("serverError"));

        if (done) {
          processSSEFrame(buffer, assistantMsg, t("serverError"));
          break;
        }
      }

      assistantMsg.status = "complete";
      assistantMsg.phase = "complete";
    } catch (e: any) {
      if (e?.name === "AbortError") {
        assistantMsg.status = assistantMsg.content ? "complete" : "error";
        assistantMsg.phase = "complete";
        assistantMsg.error = assistantMsg.content ? "" : t("stopped");
        return;
      }

      assistantMsg.status = assistantMsg.content ? "complete" : "error";
      assistantMsg.phase = "complete";
      assistantMsg.error = assistantMsg.content
        ? t("connectionInterrupted")
        : t("connectionFailed");
    } finally {
      isStreaming.value = false;
      abortController = null;
      persistHistory(historyStorageKey, messages.value);
    }
  }

  function retry() {
    const last = messages.value[messages.value.length - 1];
    if (!last || last.role !== "assistant") return;

    const prev = messages.value[messages.value.length - 2];
    if (!prev || prev.role !== "user") return;

    messages.value.pop();
    stream(prev.content);
  }

  async function regenerateFromUser(userId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    abortController?.abort();

    const userIndex = messages.value.findIndex((msg) => msg.id === userId && msg.role === "user");
    if (userIndex < 0) return;

    messages.value[userIndex].content = trimmed;
    messages.value = messages.value.slice(0, userIndex + 1);
    await stream(trimmed);
  }

  function stop() {
    abortController?.abort();
  }

  function clear() {
    clearHistory();
  }

  function saveAccessToken(token: string) {
    saveToken(token);
  }

  function clearHistory() {
    abortController?.abort();
    messages.value = [];
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    try {
      localStorage.removeItem(historyStorageKey);
    } catch {
      // Ignore unavailable storage.
    }
  }

  function clearStoredToken() {
    clearToken();
  }

  function clearStoredData() {
    clearHistory();
    clearStoredToken();
  }

  function createRequestHistory(): RequestHistoryMessage[] {
    return messages.value
      .filter((msg) => msg.content.trim())
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
  }

  function trimHistory() {
    if (messages.value.length <= HISTORY_LIMIT) return;
    messages.value = messages.value.slice(-HISTORY_LIMIT);
  }

  return {
    messages,
    isStreaming,
    send,
    retry,
    regenerateFromUser,
    stop,
    clear,
    clearHistory,
    clearStoredToken,
    clearStoredData,
    needsSetup,
    saveToken: saveAccessToken,
  };
}

function processSSEBuffer(
  buffer: string,
  assistantMsg: ChatMessage,
  serverErrorText: string,
): string {
  const frames = buffer.split(/\r?\n\r?\n/);
  let rest = frames.pop() || "";

  for (const frame of frames) {
    processSSEFrame(frame, assistantMsg, serverErrorText);
  }

  if (frames.length === 0 && rest.includes("\n")) {
    const lines = rest.split(/\r?\n/);
    rest = lines.pop() || "";

    for (const line of lines) {
      processSSEFrame(line, assistantMsg, serverErrorText);
    }
  }

  return rest;
}

function processSSEFrame(
  frame: string,
  assistantMsg: ChatMessage,
  serverErrorText: string,
) {
  const trimmed = frame.trim();
  if (!trimmed) return;

  const eventName = getSSEEventName(trimmed);
  const payload = getSSEPayload(trimmed);
  if (!payload || payload === "[DONE]") {
    if (eventName === "done" || payload === "[DONE]") {
      assistantMsg.phase = "complete";
    }
    return;
  }

  try {
    const data: SSEData = JSON.parse(payload);
    applySSEData(data, assistantMsg, eventName, serverErrorText);
  } catch {
    if (eventName === "text" || !trimmed.startsWith("data:")) {
      appendAssistantText(assistantMsg, payload);
    }
  }
}

function applySSEData(
  data: SSEData,
  assistantMsg: ChatMessage,
  eventName: string | null,
  serverErrorText: string,
) {
  const eventType = "type" in data ? data.type : null;

  if ("token" in data) {
    appendAssistantText(assistantMsg, data.token);
    return;
  }

  if (
    "content" in data &&
    typeof data.content === "string" &&
    (eventType === "text" || eventName === "text")
  ) {
    appendAssistantText(assistantMsg, data.content);
    return;
  }

  if ("content" in data && typeof data.content === "string" && !("type" in data)) {
    appendAssistantText(assistantMsg, data.content);
    return;
  }

  if (eventType === "source" && "content" in data && typeof data.content === "object") {
    assistantMsg.sources = [...assistantMsg.sources, normalizeSource(data.content)];
    if (!assistantMsg.content) assistantMsg.phase = "searching";
    return;
  }

  if (eventType === "sources" && "sources" in data) {
    assistantMsg.sources = data.sources.map(normalizeSource);
    if (!assistantMsg.content) assistantMsg.phase = "searching";
    return;
  }

  if (eventType === "done") {
    assistantMsg.phase = "complete";
    return;
  }

  if (eventType === "error" && "type" in data) {
    assistantMsg.status = "error";
    assistantMsg.phase = "complete";
    assistantMsg.error =
      ("message" in data ? data.message : "") ||
      ("error" in data ? data.error : "") ||
      serverErrorText;
  }
}

function appendAssistantText(assistantMsg: ChatMessage, text: string) {
  if (!text) return;
  assistantMsg.content += text;
  assistantMsg.phase = "answering";
}

function getSSEPayload(frame: string): string {
  const dataLines = frame
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart());

  if (dataLines.length) return dataLines.join("\n").trim();
  return frame.trim();
}

function getSSEEventName(frame: string): string | null {
  const eventLine = frame
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("event:"));

  return eventLine ? eventLine.slice(6).trim() : null;
}

function normalizeSource(source: Source | ChatSource): Source {
  if ("url" in source && source.url) {
    return {
      title: source.title,
      url: source.url,
      path: source.path,
      hierarchy: source.hierarchy,
      anchor: source.anchor,
    };
  }

  const chatSource = source as ChatSource;
  return {
    title: chatSource.title,
    url: chatSource.path,
    path: chatSource.path,
    hierarchy: chatSource.hierarchy,
    anchor: chatSource.anchor,
  };
}

function createHistoryStorageKey(options: RAGSearchPluginOptions): string {
  return `rag_chat_history:${options.baseUrl || "default"}`;
}

function createRequestHeaders(token: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  return headers;
}

function loadHistory(storageKey: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(isStoredMessage)
      .slice(-HISTORY_LIMIT)
      .map((msg) => ({
        ...msg,
        status: msg.status === "streaming" ? "complete" : msg.status,
        phase: "complete",
      }));
  } catch {
    return [];
  }
}

function persistHistory(storageKey: string, messages: ChatMessage[]) {
  try {
    const stored = messages
      .filter((msg) => msg.content.trim() || msg.sources.length || msg.status === "error")
      .slice(-HISTORY_LIMIT)
      .map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        sources: msg.sources,
        status: msg.status === "streaming" ? "complete" : msg.status,
        phase: "complete",
        error: msg.error,
      }));

    if (!stored.length) {
      localStorage.removeItem(storageKey);
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify(stored));
  } catch {
    // Ignore unavailable storage.
  }
}

function isStoredMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const msg = value as ChatMessage;
  return (
    (msg.role === "user" || msg.role === "assistant") &&
    typeof msg.content === "string" &&
    Array.isArray(msg.sources) &&
    (msg.status === "streaming" || msg.status === "complete" || msg.status === "error")
  );
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
