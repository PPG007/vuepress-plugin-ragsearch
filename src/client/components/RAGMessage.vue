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
