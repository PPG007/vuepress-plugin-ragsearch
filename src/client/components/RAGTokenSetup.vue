<script setup lang="ts">
import { ref } from 'vue'
import { useOptions } from '../options'
import { useI18n } from '../composables/useI18n'

const emit = defineEmits<{
  save: [token: string]
  cancel: []
}>()

const token = ref('')
const options = useOptions()
const { t } = useI18n(options)

function onSave() {
  emit('save', token.value.trim())
}
</script>

<template>
  <section class="rag-token-setup">
    <div class="rag-token-setup__panel">
      <div class="rag-token-setup__icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="7.5" cy="15.5" r="5.5" />
          <path d="m12 12 8-8" />
          <path d="m17 5 2 2" />
          <path d="m15 7 2 2" />
        </svg>
      </div>
      <h3>{{ t('tokenTitle') }}</h3>
      <p class="rag-token-setup__desc">{{ t('tokenDescription') }}</p>
      <form class="rag-token-setup__form" @submit.prevent="onSave">
        <input
          v-model="token"
          class="rag-token-setup__input"
          type="password"
          :placeholder="t('tokenPlaceholder')"
          autocomplete="off"
        />
        <div class="rag-token-setup__actions">
          <button class="rag-token-setup__btn rag-token-setup__btn--ghost" type="button" @click="emit('cancel')">
            {{ t('cancel') }}
          </button>
          <button class="rag-token-setup__btn" type="submit">
            {{ t('save') }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped>
.rag-token-setup {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: color-mix(in srgb, var(--vp-c-bg-soft) 50%, var(--vp-c-bg));
}

.rag-token-setup__panel {
  width: 100%;
  max-width: 360px;
  padding: 22px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.08);
}

.rag-token-setup__icon {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--rag-c-accent, var(--vp-c-accent, var(--vp-c-brand, #3f7ef7))) 12%, var(--vp-c-bg-soft));
  color: var(--rag-c-accent, var(--vp-c-accent, var(--vp-c-brand, #3f7ef7)));
}

.rag-token-setup h3 {
  margin: 0 0 8px;
  color: var(--vp-c-text-1);
  font-size: 17px;
  line-height: 1.35;
}

.rag-token-setup__desc {
  margin: 0 0 18px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.6;
}

.rag-token-setup__form {
  display: grid;
  gap: 12px;
}

.rag-token-setup__input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: inherit;
}

.rag-token-setup__input:focus {
  border-color: var(--rag-c-accent, var(--vp-c-accent, var(--vp-c-brand, #3f7ef7)));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--rag-c-accent, var(--vp-c-accent, var(--vp-c-brand, #3f7ef7))) 16%, transparent);
}

.rag-token-setup__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.rag-token-setup__btn {
  min-width: 76px;
  padding: 9px 14px;
  border: 1px solid var(--rag-c-accent, var(--vp-c-accent, var(--vp-c-brand, #3f7ef7)));
  border-radius: 8px;
  background: var(--rag-c-accent, var(--vp-c-accent, var(--vp-c-brand, #3f7ef7)));
  color: var(--vp-c-accent-text, var(--vp-c-white, #ffffff));
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.rag-token-setup__btn--ghost {
  border-color: var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
}

.rag-token-setup__btn:hover {
  filter: brightness(1.04);
}
</style>
