const RAG_THEME_COLOR_PROPERTY = "--rag-c-accent";

let currentThemeColor = "";

export function setRAGSearchThemeColor(color: string): void {
  applyRAGSearchTheme(color);
}

export function getRAGSearchThemeColor(): string {
  return currentThemeColor;
}

export function applyRAGSearchTheme(color?: string): void {
  currentThemeColor = typeof color === "string" ? color.trim() : "";

  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (currentThemeColor) {
    root.style.setProperty(RAG_THEME_COLOR_PROPERTY, currentThemeColor);
    return;
  }

  root.style.removeProperty(RAG_THEME_COLOR_PROPERTY);
}
