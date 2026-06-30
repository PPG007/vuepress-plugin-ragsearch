<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  disabled: boolean
}>()

const emit = defineEmits<{
  send: [text: string]
}>()

const text = ref('')

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
      placeholder="输入你的问题..."
      rows="1"
      @keydown.enter.exact.prevent="onSubmit"
    />
    <button
      class="rag-input__btn"
      :disabled="disabled || !text.trim()"
      type="submit"
    >发送</button>
  </form>
</template>

<style scoped>
.rag-input { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--vp-c-divider); }
.rag-input__textarea {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 14px;
  resize: none;
  outline: none;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: inherit;
}
.rag-input__textarea:focus { border-color: var(--vp-c-brand); }
.rag-input__btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: var(--vp-c-brand);
  color: var(--vp-c-white);
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
}
.rag-input__btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
