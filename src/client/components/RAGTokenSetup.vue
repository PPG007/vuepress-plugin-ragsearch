<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  save: [token: string]
}>()

const token = ref('')

function onSave() {
  const trimmed = token.value.trim()
  if (!trimmed) return
  emit('save', trimmed)
}
</script>

<template>
  <div class="rag-token-setup">
    <div class="rag-token-setup__icon">🔑</div>
    <h3>配置访问 Token</h3>
    <p class="rag-token-setup__desc">请输入 RAG 后端的访问 Token</p>
    <form @submit.prevent="onSave">
      <input
        v-model="token"
        class="rag-token-setup__input"
        type="password"
        placeholder="请输入 Token"
      />
      <button
        class="rag-token-setup__btn"
        :disabled="!token.trim()"
        type="submit"
      >确认</button>
    </form>
  </div>
</template>

<style scoped>
.rag-token-setup { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 40px 24px; text-align: center; }
.rag-token-setup__icon { font-size: 48px; margin-bottom: 16px; }
.rag-token-setup h3 { font-size: 16px; margin-bottom: 8px; color: var(--vp-c-text-1); }
.rag-token-setup__desc { font-size: 13px; color: var(--vp-c-text-2); margin-bottom: 20px; }
.rag-token-setup__input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  margin-bottom: 12px;
}
.rag-token-setup__input:focus { border-color: var(--vp-c-brand); }
.rag-token-setup__btn {
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 8px;
  background: var(--vp-c-brand);
  color: var(--vp-c-white);
  font-size: 14px;
  cursor: pointer;
}
.rag-token-setup__btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
