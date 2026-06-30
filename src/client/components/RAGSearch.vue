<script setup lang="ts">
import { useDrawer } from '../composables/useDrawer'
import RAGDrawer from './RAGDrawer.vue'

const { isOpen, open } = useDrawer()
</script>

<template>
  <button class="rag-search-btn" :class="{ 'rag-search-btn--hidden': isOpen }" @click="open" title="RAG 搜索">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
    <span class="rag-search-btn__text">搜索</span>
  </button>
  <RAGDrawer />
</template>

<style scoped>
.rag-search-btn {
  position: fixed;
  top: 14px;
  right: 20px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}
.rag-search-btn:hover { color: var(--vp-c-brand); border-color: var(--vp-c-brand); }
.rag-search-btn--hidden { opacity: 0; pointer-events: none; }
.rag-search-btn__text { white-space: nowrap; }
</style>
