<script setup lang="ts">
import { computed, ref } from 'vue'
import { useOptions } from '../options'
import { useI18n } from '../composables/useI18n'

const props = defineProps<{
  disabled: boolean
}>()

const emit = defineEmits<{
  send: [text: string]
  stop: []
}>()

const text = ref('')
const options = useOptions()
const { t } = useI18n(options)
const canSend = computed(() => Boolean(text.value.trim()) && !props.disabled)

function onSubmit() {
  const trimmed = text.value.trim()
  if (!trimmed || props.disabled) return
  emit('send', trimmed)
  text.value = ''
}
</script>

<template>
  <form class="rag-input" @submit.prevent="onSubmit">
    <textarea
      v-model="text"
      class="rag-input__textarea"
      :disabled="disabled"
      :placeholder="disabled ? t('inputStreamingPlaceholder') : t('inputPlaceholder')"
      rows="1"
      @keydown.enter.exact.prevent="onSubmit"
    />
    <button
      v-if="disabled"
      class="rag-input__btn rag-input__btn--stop"
      type="button"
      :title="t('stopGeneratingTitle')"
      @click="emit('stop')"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <rect x="6" y="6" width="12" height="12" rx="2" />
      </svg>
    </button>
    <button
      v-else
      class="rag-input__btn"
      :disabled="!canSend"
      type="submit"
      :title="t('sendTitle')"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </svg>
    </button>
  </form>
</template>

<style scoped>
.rag-input {
  --rag-c-accent-color: var(--rag-c-accent, var(--vp-c-accent, var(--vp-c-brand, #3f7ef7)));
  --rag-c-bg-color: var(--vp-c-bg, Canvas);
  --rag-c-divider-color: var(--vp-c-divider, color-mix(in srgb, CanvasText 18%, Canvas));
  --rag-c-text-color: var(--vp-c-text-1, CanvasText);
  --rag-c-danger-color: var(--vp-c-danger, #d5393e);
  --rag-c-on-accent-color: var(--vp-c-white, #ffffff);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 9px;
  padding: 13px 16px 16px;
  border-top: 1px solid var(--rag-c-divider-color);
  background: var(--rag-c-bg-color);
}

.rag-input__textarea {
  width: 100%;
  min-height: 42px;
  max-height: 128px;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--rag-c-divider-color);
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.45;
  resize: vertical;
  outline: none;
  background: var(--rag-c-bg-color);
  color: var(--rag-c-text-color);
  font-family: inherit;
}

.rag-input__textarea:focus {
  border-color: var(--rag-c-accent-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--rag-c-accent-color) 14%, transparent);
}

.rag-input__textarea:disabled {
  cursor: wait;
  opacity: 0.72;
}

.rag-input__btn {
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--rag-c-accent-color) 76%, transparent);
  border-radius: 8px;
  background: var(--rag-c-accent-color);
  color: var(--rag-c-on-accent-color);
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease, filter 0.2s ease;
}

.rag-input__btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.04);
}

.rag-input__btn:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.rag-input__btn--stop {
  border-color: var(--rag-c-danger-color);
  background: var(--rag-c-danger-color);
  color: var(--rag-c-on-accent-color);
}

@media (max-width: 480px) {
  .rag-input {
    padding: 12px 14px 14px;
  }
}
</style>
