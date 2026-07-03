<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import type { ChatMessage } from '../../types'
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

const md = new MarkdownIt({ breaks: true, linkify: true })
const options = useOptions()
const { t } = useI18n(options)
const isEditing = ref(false)
const editText = ref(props.message.content)
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const rendered = computed(() => {
  if (!props.message.content) return ''
  return md.render(props.message.content)
})

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

      <div v-else class="rag-msg__content rag-msg__content--assistant">
        <div v-if="rendered" class="rag-msg__markdown" v-html="rendered" />
        <div v-else-if="message.status === 'streaming'" class="rag-msg__thinking" :aria-label="t('processingLabel')">
          <span />
          <span />
          <span />
        </div>
        <span v-if="message.status === 'streaming' && message.content" class="rag-msg__cursor" />
      </div>

      <div v-if="message.sources?.length" class="rag-msg__sources">
        <span class="rag-msg__sources-label">{{ t('sourcesLabel') }}</span>
        <a
          v-for="(s, i) in message.sources"
          :key="i"
          :href="s.url"
          class="rag-msg__source-link"
        >
          {{ i + 1 }}. {{ s.title }}
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
  display: flex;
  gap: 10px;
  padding: 10px 18px;
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
  max-width: min(84%, 350px);
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
.rag-msg__markdown :deep(pre:last-child) {
  margin-bottom: 0;
}

.rag-msg__markdown :deep(a) {
  color: var(--rag-c-accent-color);
  text-decoration: none;
}

.rag-msg__markdown :deep(a:hover) {
  text-decoration: underline;
}

.rag-msg__markdown :deep(pre) {
  overflow-x: auto;
  padding: 10px;
  border-radius: 8px;
  background: var(--vp-code-block-bg, var(--rag-c-bg-soft-color));
}

.rag-msg__markdown :deep(code) {
  font-size: 0.92em;
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
