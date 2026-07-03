<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import {
  createHighlighter,
  createJavaScriptRegexEngine,
  type BundledLanguage,
  type Highlighter,
} from 'shiki'
import type { ChatMessage, Source } from '../../types'
import { useOptions } from '../options'
import { useI18n } from '../composables/useI18n'

const props = defineProps<{
  message: ChatMessage
  canEdit?: boolean
}>()

const emit = defineEmits<{
  retry: []
  regenerate: [{ id: string; text: string }]
}>()

const SHIKI_THEMES = { light: 'github-light', dark: 'one-dark-pro' } as const
const SHIKI_LANGUAGES = [
  'bash',
  'c',
  'cpp',
  'css',
  'diff',
  'dockerfile',
  'go',
  'html',
  'java',
  'javascript',
  'json',
  'markdown',
  'php',
  'python',
  'rust',
  'shell',
  'sql',
  'text',
  'tsx',
  'typescript',
  'vue',
  'xml',
  'yaml',
] satisfies BundledLanguage[]

const options = useOptions()
const { t } = useI18n(options)
const md = createMarkdownRenderer()
const isEditing = ref(false)
const editText = ref(props.message.content)
const copied = ref(false)
const rendered = ref('')
let copiedTimer: ReturnType<typeof setTimeout> | null = null
let renderId = 0
let highlighterPromise: Promise<Highlighter> | null = null

watch(
  () => props.message.content,
  async (content) => {
    const currentRenderId = ++renderId

    if (!content) {
      rendered.value = ''
      return
    }

    const html = await renderMarkdown(content)
    if (currentRenderId === renderId) {
      rendered.value = html
    }
  },
  { immediate: true },
)

const phaseText = computed(() => {
  if (props.message.status === 'error') return t('phaseError')
  if (props.message.status === 'complete') return t('phaseComplete')

  switch (props.message.phase) {
    case 'connecting':
      return t('phaseConnecting')
    case 'searching':
      return t('phaseSearching')
    case 'answering':
      return t('phaseAnswering')
    default:
      return t('phaseQueued')
  }
})

const displayedSources = computed(() => {
  const sources = props.message.sources || []
  return sources.filter((source, index) =>
    !sources.some((other, otherIndex) => otherIndex !== index && isParentSource(source, other)),
  )
})

watch(
  () => props.message.content,
  (content) => {
    if (!isEditing.value) {
      editText.value = content
    }
  },
)

async function copyMessage() {
  await copyText(props.message.content)
  copied.value = true
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copied.value = false
  }, 1400)
}

async function handleMarkdownClick(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof HTMLElement)) return

  const button = target.closest<HTMLButtonElement>('.rag-code-copy')
  if (!button) return

  const container = event.currentTarget
  if (!(container instanceof HTMLElement) || !container.contains(button)) return

  const code = button.closest('.rag-code-block')?.querySelector('pre code')
  const text = code?.textContent ?? ''
  if (!text) return

  await copyText(text)

  button.textContent = t('copied')
  button.classList.add('rag-code-copy--copied')
  button.disabled = true

  window.setTimeout(() => {
    button.textContent = t('copy')
    button.classList.remove('rag-code-copy--copied')
    button.disabled = false
  }, 1400)
}

function startEdit() {
  editText.value = props.message.content
  isEditing.value = true
}

function cancelEdit() {
  editText.value = props.message.content
  isEditing.value = false
}

function regenerate(text = props.message.content) {
  const trimmed = text.trim()
  if (!trimmed) return

  isEditing.value = false
  emit('regenerate', { id: props.message.id, text: trimmed })
}

function sourceHref(source: Source) {
  const anchor = cleanSourceText(source.anchor).replace(/^#/, '')
  if (!anchor || source.url.includes('#')) return source.url
  return `${source.url}#${anchor}`
}

function sourceLabel(source: Source) {
  const title = normalizeSourceDisplayTitle(source)
  const anchor = normalizeSourceDisplayAnchor(source)
  if (anchor && sourceTitleIncludesAnchor(title, anchor)) return title
  return anchor ? `${title} #${anchor}` : title
}

function isParentSource(parent: Source, child: Source) {
  return (
    isParentHierarchy(parent, child) ||
    isParentAnchorSource(parent, child) ||
    isParentPathSource(parent, child)
  )
}

function isParentHierarchy(parent: Source, child: Source) {
  const parentHierarchy = normalizeSourceHierarchy(parent)
  const childHierarchy = normalizeSourceHierarchy(child)
  if (!parentHierarchy.length || parentHierarchy.length >= childHierarchy.length) return false

  return parentHierarchy.every((part, index) => part === childHierarchy[index])
}

function isParentAnchorSource(parent: Source, child: Source) {
  const parentUrl = splitSourceUrl(sourceHref(parent))
  const childUrl = splitSourceUrl(sourceHref(child))

  return parentUrl.base === childUrl.base && !parentUrl.anchor && !!childUrl.anchor
}

function isParentPathSource(parent: Source, child: Source) {
  const parentPath = normalizeSourcePath(parent.path || parent.url)
  const childPath = normalizeSourcePath(child.path || child.url)
  if (!parentPath || !childPath || parentPath === childPath) return false

  return childPath.startsWith(parentPath.endsWith('/') ? parentPath : `${parentPath}/`)
}

function normalizeSourceDisplayTitle(source: Source) {
  const title = cleanSourceText(source.title)
  if (title && !isSourceUrlLike(title)) return title

  const hierarchyTitle = source.hierarchy
    ?.map(cleanSourceText)
    .find((part) => part && !isSourceUrlLike(part))
  if (hierarchyTitle) return hierarchyTitle

  return inferSourceTitleFromUrl(source.path || source.url) || title || source.url
}

function normalizeSourceDisplayAnchor(source: Source) {
  const hierarchyAnchor = source.hierarchy
    ?.slice(1)
    .map(cleanSourceText)
    .filter(Boolean)
    .join(' > ')

  return hierarchyAnchor || cleanSourceText(source.anchor).replace(/^#/, '')
}

function inferSourceTitleFromUrl(value: string) {
  const path = cleanSourceText(value).split('#')[0].split('?')[0].replace(/\/+$/, '')
  if (!path) return ''

  const segment = path.split('/').filter(Boolean).pop()
  if (!segment) return path

  return safeDecodeURIComponent(segment)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()
}

function normalizeSourceHierarchy(source: Source) {
  return (source.hierarchy || [])
    .map((part) => cleanSourceText(part).toLowerCase())
    .filter(Boolean)
}

function splitSourceUrl(value: string) {
  const [base, anchor = ''] = cleanSourceText(value).split('#')
  return {
    base: normalizeSourcePath(base),
    anchor: cleanSourceText(anchor).toLowerCase(),
  }
}

function normalizeSourcePath(value: string) {
  const withoutHash = cleanSourceText(value).split('#')[0].split('?')[0]
  const normalized = withoutHash.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
  return normalized || withoutHash
}

function sourceTitleIncludesAnchor(title: string, anchor: string) {
  const normalizedTitle = title.toLowerCase()
  const normalizedAnchor = anchor.toLowerCase()
  return normalizedTitle.endsWith(`#${normalizedAnchor}`) || normalizedTitle.endsWith(` #${normalizedAnchor}`)
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function isSourceUrlLike(value: string) {
  return /^(?:https?:)?\/\//i.test(value) || value.startsWith('/') || value.includes('\\')
}

function cleanSourceText(value?: string) {
  return (value || '').trim()
}

function createMarkdownRenderer() {
  const renderer = new MarkdownIt({ breaks: true, linkify: true })

  renderer.renderer.rules.fence = (tokens, idx, _options, env) => {
    const codeBlocks = getCodeBlocks(env)
    const token = tokens[idx]
    const language = token.info.trim().split(/\s+/)[0] || 'text'
    const placeholder = `<!--rag-code-block-${codeBlocks.length}-->`

    codeBlocks.push({ code: token.content, language, placeholder })
    return placeholder
  }

  renderer.renderer.rules.code_block = (tokens, idx, _options, env) => {
    const codeBlocks = getCodeBlocks(env)
    const placeholder = `<!--rag-code-block-${codeBlocks.length}-->`

    codeBlocks.push({ code: tokens[idx].content, language: 'text', placeholder })
    return placeholder
  }

  return renderer
}

async function renderMarkdown(content: string) {
  const env: RenderEnv = { codeBlocks: [] }
  let html = md.render(content, env)

  const renderedBlocks = await Promise.all(
    env.codeBlocks.map((block) => renderCodeBlock(block.code, block.language)),
  )

  env.codeBlocks.forEach((block, index) => {
    html = html.replace(block.placeholder, renderedBlocks[index])
  })

  return html
}

function getCodeBlocks(env: unknown) {
  return (env as RenderEnv).codeBlocks
}

async function renderCodeBlock(code: string, language = '') {
  const normalizedLanguage = language || 'text'
  const languageClass = ` class="language-${escapeHtml(normalizedLanguage)}"`
  const languageLabel = escapeHtml(formatCodeLanguage(normalizedLanguage))
  const label = escapeHtml(t('copy'))
  const codeHtml = await highlightCode(code, normalizedLanguage)

  return [
    '<div class="rag-code-block">',
    `<button class="rag-code-copy" type="button" aria-label="${label}">${label}</button>`,
    `<span class="rag-code-lang">${languageLabel}</span>`,
    codeHtml.replace('<code>', `<code${languageClass}>`),
    '</div>',
  ].join('')
}

async function highlightCode(code: string, language: string) {
  const shikiLanguage = normalizeShikiLanguage(language)

  try {
    const highlighter = await getShikiHighlighter()
    await ensureShikiLanguage(highlighter, shikiLanguage)

    return highlighter.codeToHtml(code, {
      lang: shikiLanguage,
      themes: SHIKI_THEMES,
    })
  } catch {
    return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`
  }
}

function getShikiHighlighter() {
  highlighterPromise ??= createHighlighter({
    themes: Object.values(SHIKI_THEMES),
    langs: SHIKI_LANGUAGES,
    engine: createJavaScriptRegexEngine(),
  })

  return highlighterPromise
}

async function ensureShikiLanguage(highlighter: Highlighter, language: BundledLanguage) {
  if (highlighter.getLanguage(language)) return
  await highlighter.loadLanguage(language)
}

function normalizeShikiLanguage(language: string) {
  const aliases: Record<string, BundledLanguage> = {
    csharp: 'csharp',
    cs: 'csharp',
    docker: 'dockerfile',
    dockerfile: 'dockerfile',
    go: 'go',
    golang: 'go',
    markdown: 'md',
    plaintext: 'text',
    rb: 'ruby',
    ruby: 'ruby',
    rs: 'rust',
    shell: 'sh',
    typescript: 'ts',
    javascript: 'js',
    yml: 'yaml',
  }

  return aliases[language.toLowerCase()] ?? (language as BundledLanguage)
}

function formatCodeLanguage(language: string) {
  const labels: Record<string, string> = {
    bash: 'Bash',
    css: 'CSS',
    html: 'HTML',
    js: 'JavaScript',
    javascript: 'JavaScript',
    json: 'JSON',
    md: 'Markdown',
    markdown: 'Markdown',
    plaintext: 'Text',
    shell: 'Shell',
    sh: 'Shell',
    text: 'Text',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    vue: 'Vue',
    xml: 'XML',
    yaml: 'YAML',
    yml: 'YAML',
  }

  return labels[language.toLowerCase()] ?? language
}

type CodeBlock = {
  code: string
  language: string
  placeholder: string
}

type RenderEnv = {
  codeBlocks: CodeBlock[]
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}
</script>

<template>
  <article class="rag-msg" :class="[`rag-msg--${message.role}`, `rag-msg--${message.status}`]">
    <div class="rag-msg__avatar" aria-hidden="true">
      {{ message.role === 'user' ? t('userAvatar') : t('assistantAvatar') }}
    </div>
    <div class="rag-msg__body">
      <div v-if="message.role === 'assistant'" class="rag-msg__meta">
        <span class="rag-msg__phase" :class="{ 'rag-msg__phase--active': message.status === 'streaming' }">
          <span v-if="message.status === 'streaming'" class="rag-msg__phase-dot" />
          {{ phaseText }}
        </span>
      </div>

      <template v-if="message.role === 'user'">
        <div class="rag-msg__content rag-msg__content--user">
          <textarea
            v-if="isEditing"
            v-model="editText"
            class="rag-msg__edit"
            :aria-label="t('editQuestionLabel')"
            rows="3"
            @keydown.enter.ctrl.prevent="regenerate(editText)"
            @keydown.esc.prevent="cancelEdit"
          />
          <div v-else class="rag-msg__plain">{{ message.content }}</div>
        </div>

        <div class="rag-msg__tools">
          <button class="rag-msg__tool" type="button" @click="copyMessage">
            {{ copied ? t('copied') : t('copy') }}
          </button>
          <template v-if="canEdit">
            <button v-if="!isEditing" class="rag-msg__tool" type="button" @click="startEdit">
              {{ t('edit') }}
            </button>
            <button v-if="!isEditing" class="rag-msg__tool" type="button" @click="regenerate()">
              {{ t('regenerate') }}
            </button>
            <button v-if="isEditing" class="rag-msg__tool" type="button" @click="cancelEdit">
              {{ t('cancel') }}
            </button>
            <button
              v-if="isEditing"
              class="rag-msg__tool rag-msg__tool--primary"
              type="button"
              :disabled="!editText.trim()"
              @click="regenerate(editText)"
            >
              {{ t('saveAndRegenerate') }}
            </button>
          </template>
        </div>
      </template>

      <div v-else class="rag-msg__content rag-msg__content--assistant" @click="handleMarkdownClick">
        <div v-if="rendered" class="rag-msg__markdown" v-html="rendered" />
        <div v-else-if="message.status === 'streaming'" class="rag-msg__thinking" :aria-label="t('processingLabel')">
          <span />
          <span />
          <span />
        </div>
        <span v-if="message.status === 'streaming' && message.content" class="rag-msg__cursor" />
      </div>

      <div v-if="displayedSources.length" class="rag-msg__sources">
        <span class="rag-msg__sources-label">{{ t('sourcesLabel') }}</span>
        <a
          v-for="(s, i) in displayedSources"
          :key="i"
          :href="sourceHref(s)"
          class="rag-msg__source-link"
          :title="sourceLabel(s)"
        >
          {{ i + 1 }}. {{ sourceLabel(s) }}
        </a>
      </div>

      <div v-if="message.status === 'error'" class="rag-msg__error">
        <span>{{ message.error }}</span>
        <button class="rag-msg__retry" type="button" @click="$emit('retry')">{{ t('retry') }}</button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.rag-msg {
  --rag-c-accent-color: var(--rag-c-accent, var(--vp-c-accent, var(--vp-c-brand, #3f7ef7)));
  --rag-c-bg-color: var(--vp-c-bg, Canvas);
  --rag-c-bg-soft-color: var(--vp-c-bg-soft, color-mix(in srgb, CanvasText 6%, Canvas));
  --rag-c-divider-color: var(--vp-c-divider, color-mix(in srgb, CanvasText 18%, Canvas));
  --rag-c-text-color: var(--vp-c-text-1, CanvasText);
  --rag-c-muted-color: var(--vp-c-text-2, color-mix(in srgb, CanvasText 70%, Canvas));
  --rag-c-danger-color: var(--vp-c-danger, #d5393e);
  --rag-c-on-accent-color: var(--vp-c-white, #ffffff);
  --rag-code-bg-color: var(--vp-code-block-bg, color-mix(in srgb, var(--rag-c-text-color) 5%, var(--rag-c-bg-soft-color)));
  --rag-code-text-color: var(--vp-code-color, var(--rag-c-text-color));
  --rag-code-border-color: color-mix(in srgb, var(--rag-c-text-color) 12%, transparent);
  --rag-code-copy-bg-color: color-mix(in srgb, var(--rag-c-bg-color) 82%, transparent);
  --rag-code-copy-hover-bg-color: color-mix(in srgb, var(--rag-c-bg-color) 94%, transparent);
  display: flex;
  gap: 10px;
  padding: 10px 18px;
}

:global(html.dark .rag-msg),
:global(html[data-theme="dark"] .rag-msg),
:global(body.dark .rag-msg),
:global(body[data-theme="dark"] .rag-msg) {
  --rag-code-bg-color: #282c34;
  --rag-code-text-color: #abb2bf;
  --rag-code-border-color: #3e4451;
  --rag-code-copy-bg-color: rgba(33, 37, 43, 0.82);
  --rag-code-copy-hover-bg-color: rgba(62, 68, 81, 0.92);
}

.rag-msg--user {
  flex-direction: row-reverse;
}

.rag-msg__avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  border-radius: 8px;
  background: var(--rag-c-bg-soft-color);
  color: var(--rag-c-muted-color);
  font-size: 12px;
  font-weight: 750;
}

.rag-msg--assistant .rag-msg__avatar {
  background: color-mix(in srgb, var(--rag-c-accent-color) 12%, var(--rag-c-bg-soft-color));
  color: var(--rag-c-accent-color);
}

.rag-msg--user .rag-msg__avatar {
  background: color-mix(in srgb, var(--rag-c-text-color) 8%, var(--rag-c-bg-soft-color));
  color: var(--rag-c-text-color);
}

.rag-msg__body {
  display: flex;
  flex-direction: column;
  max-width: min(84%, 700px);
  min-width: 0;
}

.rag-msg--user .rag-msg__body {
  align-items: flex-end;
}

.rag-msg__meta {
  display: flex;
  margin-bottom: 5px;
}

.rag-msg__phase {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 20px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--rag-c-bg-soft-color);
  color: var(--rag-c-muted-color);
  font-size: 12px;
  line-height: 1.3;
}

.rag-msg__phase--active {
  color: var(--rag-c-accent-color);
  background: color-mix(in srgb, var(--rag-c-accent-color) 10%, var(--rag-c-bg-soft-color));
}

.rag-msg__phase-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: rag-pulse 1s ease-in-out infinite;
}

.rag-msg__content {
  position: relative;
  min-width: 52px;
  min-height: 38px;
  box-sizing: border-box;
  padding: 9px 13px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.65;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.rag-msg__content--user {
  border: 1px solid color-mix(in srgb, var(--rag-c-accent-color) 32%, var(--rag-c-divider-color));
  background: color-mix(in srgb, var(--rag-c-accent-color) 12%, var(--rag-c-bg-soft-color));
  color: var(--rag-c-text-color);
}

.rag-msg__content--assistant {
  border: 1px solid var(--rag-c-divider-color);
  background: var(--rag-c-bg-color);
  color: var(--rag-c-text-color);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
}

.rag-msg--error.rag-msg--assistant .rag-msg__content {
  border-color: color-mix(in srgb, var(--rag-c-danger-color) 42%, var(--rag-c-divider-color));
}

.rag-msg__markdown :deep(p) {
  margin: 0 0 0.72em;
}

.rag-msg__plain {
  white-space: pre-wrap;
}

.rag-msg__edit {
  width: min(300px, 100%);
  min-width: 220px;
  box-sizing: border-box;
  border: none;
  outline: none;
  resize: vertical;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: inherit;
}

.rag-msg__edit::selection {
  background: color-mix(in srgb, var(--rag-c-accent-color) 24%, transparent);
}

.rag-msg__tools {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 6px;
}

.rag-msg__tool {
  padding: 2px 7px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--rag-c-muted-color);
  cursor: pointer;
  font-size: 12px;
  line-height: 1.5;
  font-family: inherit;
}

.rag-msg__tool:hover {
  border-color: color-mix(in srgb, var(--rag-c-accent-color) 28%, var(--rag-c-divider-color));
  background: var(--rag-c-bg-soft-color);
  color: var(--rag-c-accent-color);
}

.rag-msg__tool:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.rag-msg__tool--primary {
  border-color: color-mix(in srgb, var(--rag-c-accent-color) 76%, transparent);
  background: var(--rag-c-accent-color);
  color: var(--rag-c-on-accent-color);
}

.rag-msg__tool--primary:hover:not(:disabled) {
  background: var(--rag-c-accent-color);
  color: var(--rag-c-on-accent-color);
  filter: brightness(1.04);
}

.rag-msg__markdown :deep(p:last-child),
.rag-msg__markdown :deep(ul:last-child),
.rag-msg__markdown :deep(ol:last-child),
.rag-msg__markdown :deep(pre:last-child),
.rag-msg__markdown :deep(.rag-code-block:last-child) {
  margin-bottom: 0;
}

.rag-msg__markdown :deep(a) {
  color: var(--rag-c-accent-color);
  text-decoration: none;
}

.rag-msg__markdown :deep(a:hover) {
  text-decoration: underline;
}

.rag-msg__markdown :deep(.rag-code-block) {
  position: relative;
  margin: 0.72em 0;
}

.rag-msg__markdown :deep(.rag-code-copy) {
  position: absolute;
  top: 4px;
  left: 6px;
  z-index: 1;
  padding: 3px 8px;
  border: 1px solid var(--rag-code-border-color);
  border-radius: 5px;
  background: var(--rag-code-copy-bg-color);
  color: var(--rag-code-text-color);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  line-height: 1.4;
  backdrop-filter: blur(8px);
}

.rag-msg__markdown :deep(.rag-code-copy:hover:not(:disabled)) {
  border-color: color-mix(in srgb, var(--rag-c-accent-color) 38%, var(--rag-code-border-color));
  background: var(--rag-code-copy-hover-bg-color);
}

.rag-msg__markdown :deep(.rag-code-copy--copied) {
  color: var(--rag-c-accent-color);
}

.rag-msg__markdown :deep(.rag-code-lang) {
  position: absolute;
  top: 5px;
  right: 10px;
  max-width: calc(100% - 92px);
  overflow: hidden;
  color: color-mix(in srgb, var(--rag-code-text-color) 70%, transparent);
  font-family: var(--vp-font-family-mono, ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace);
  font-size: 11px;
  line-height: 1.6;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rag-msg__markdown :deep(pre) {
  overflow-x: auto;
  margin: 0;
  padding: 29px 12px 12px;
  border: 1px solid var(--rag-code-border-color);
  border-radius: 8px;
  background: var(--rag-code-bg-color);
  color: var(--rag-code-text-color);
}

.rag-msg__markdown :deep(code) {
  font-family: var(--vp-font-family-mono, ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace);
  font-size: 0.92em;
}

.rag-msg__markdown :deep(:not(pre) > code) {
  padding: 0.15em 0.35em;
  border-radius: 4px;
  background: var(--vp-code-bg, color-mix(in srgb, var(--rag-c-text-color) 8%, transparent));
  color: var(--vp-code-color, var(--rag-c-accent-color));
}

.rag-msg__markdown :deep(pre code) {
  display: block;
  min-width: max-content;
  padding: 0;
  background: transparent;
  color: inherit;
  line-height: 1.6;
  tab-size: 2;
}

:global(html.dark .rag-msg__markdown .shiki),
:global(html.dark .rag-msg__markdown .shiki span),
:global(html[data-theme="dark"] .rag-msg__markdown .shiki),
:global(html[data-theme="dark"] .rag-msg__markdown .shiki span),
:global(body.dark .rag-msg__markdown .shiki),
:global(body.dark .rag-msg__markdown .shiki span),
:global(body[data-theme="dark"] .rag-msg__markdown .shiki),
:global(body[data-theme="dark"] .rag-msg__markdown .shiki span) {
  background-color: var(--shiki-dark-bg) !important;
  color: var(--shiki-dark) !important;
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}

.rag-msg__thinking {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 20px;
}

.rag-msg__thinking span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--rag-c-accent-color);
  animation: rag-thinking 1.1s ease-in-out infinite;
}

.rag-msg__thinking span:nth-child(2) {
  animation-delay: 0.14s;
}

.rag-msg__thinking span:nth-child(3) {
  animation-delay: 0.28s;
}

.rag-msg__cursor {
  display: inline-block;
  width: 7px;
  height: 1.15em;
  margin-left: 3px;
  vertical-align: -0.18em;
  border-right: 2px solid var(--rag-c-accent-color);
  animation: rag-blink 1s step-end infinite;
}

.rag-msg__sources {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--rag-c-muted-color);
}

.rag-msg__sources-label {
  width: 100%;
  font-weight: 700;
}

.rag-msg__source-link {
  max-width: 100%;
  padding: 4px 8px;
  border: 1px solid color-mix(in srgb, var(--rag-c-accent-color) 24%, var(--rag-c-divider-color));
  border-radius: 999px;
  color: var(--rag-c-accent-color);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rag-msg__source-link:hover {
  background: color-mix(in srgb, var(--rag-c-accent-color) 8%, transparent);
}

.rag-msg__error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 7px;
  color: var(--rag-c-danger-color);
  font-size: 12px;
}

.rag-msg__retry {
  padding: 3px 9px;
  border: 1px solid var(--rag-c-danger-color);
  border-radius: 8px;
  background: transparent;
  color: var(--rag-c-danger-color);
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
}

.rag-msg__retry:hover {
  background: var(--rag-c-danger-color);
  color: var(--rag-c-on-accent-color);
}

@keyframes rag-blink {
  50% {
    opacity: 0;
  }
}

@keyframes rag-pulse {
  50% {
    opacity: 0.38;
    transform: scale(0.78);
  }
}

@keyframes rag-thinking {
  0%,
  80%,
  100% {
    opacity: 0.34;
    transform: translateY(0);
  }

  40% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

@media (max-width: 480px) {
  .rag-msg {
    padding-inline: 14px;
  }

  .rag-msg__body {
    max-width: calc(100% - 44px);
  }
}
</style>
