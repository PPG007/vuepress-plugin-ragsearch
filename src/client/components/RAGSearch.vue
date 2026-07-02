<script setup lang="ts">
import { useOptions } from '../options'
import { useDrawer } from '../composables/useDrawer'
import { useI18n } from '../composables/useI18n'
import RAGDrawer from './RAGDrawer.vue'

const options = useOptions()
const { isOpen, open } = useDrawer()
const { t } = useI18n(options)
</script>

<template>
  <button
    class="rag-search-btn"
    :class="{ 'rag-search-btn--hidden': isOpen }"
    :title="t('searchButtonTitle')"
    @click="open"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
    <span class="rag-search-btn__text">{{ t('searchButtonText') }}</span>
  </button>
  <RAGDrawer />
</template>

<style scoped>
.rag-search-btn {
  position: fixed;
  top: calc(var(--navbar-height, 3.6rem) + 12px);
  right: 20px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 6px 13px;
  border: 1px solid color-mix(in srgb, var(--vp-c-brand) 28%, var(--vp-c-divider));
  border-radius: 8px;
  background: color-mix(in srgb, var(--vp-c-bg) 94%, var(--vp-c-brand) 6%);
  color: var(--vp-c-text-1);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
}

.rag-search-btn:hover {
  color: var(--vp-c-brand);
  border-color: var(--vp-c-brand);
  transform: translateY(-1px);
}

.rag-search-btn--hidden {
  opacity: 0;
  pointer-events: none;
}

.rag-search-btn__text {
  white-space: nowrap;
}

@media (max-width: 719px) {
  .rag-search-btn {
    top: auto;
    right: 16px;
    bottom: 18px;
  }
}
</style>
