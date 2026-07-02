<script setup lang="ts">
import { computed, ref } from 'vue'
import { useOptions } from '../options'
import { useDrawer } from '../composables/useDrawer'
import { useChat } from '../composables/useChat'
import { useI18n } from '../composables/useI18n'
import RAGMessageList from './RAGMessageList.vue'
import RAGInput from './RAGInput.vue'
import RAGTokenSetup from './RAGTokenSetup.vue'

const options = useOptions()
const { isOpen, close } = useDrawer()
const chat = useChat(options)
const { t } = useI18n(options)
const showTokenPanel = ref(false)
const showClearModal = ref(false)
const shouldClearHistory = ref(true)
const shouldClearToken = ref(false)

const messageCount = computed(() => chat.messages.value.length)
const canConfirmClear = computed(() => shouldClearHistory.value || shouldClearToken.value)
const statusText = computed(() => {
  if (chat.isStreaming.value) return t('statusStreaming')
  if (messageCount.value) return t('statusSavedMessages', { count: messageCount.value })
  return t('statusHistorySaved')
})

function openClearModal() {
  shouldClearHistory.value = true
  shouldClearToken.value = false
  showClearModal.value = true
}

function closeClearModal() {
  showClearModal.value = false
}

function confirmClearLocalData() {
  if (!canConfirmClear.value) return

  if (shouldClearHistory.value) {
    chat.clearHistory()
  }

  if (shouldClearToken.value) {
    chat.clearStoredToken()
    showTokenPanel.value = false
  }

  closeClearModal()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="rag-drawer-fade">
      <div v-if="isOpen" class="rag-overlay" @click.self="close">
        <Transition name="rag-drawer-slide">
          <aside v-if="isOpen" class="rag-drawer" :aria-label="t('drawerAriaLabel')">
            <header class="rag-drawer__header">
              <div class="rag-drawer__heading">
                <span class="rag-drawer__eyebrow">{{ t('drawerEyebrow') }}</span>
                <h2 class="rag-drawer__title">{{ t('drawerTitle') }}</h2>
                <p class="rag-drawer__status">{{ statusText }}</p>
              </div>

              <div class="rag-drawer__actions">
                <button
                  v-if="chat.isStreaming.value"
                  class="rag-drawer__icon-btn"
                  type="button"
                  :title="t('stopGeneratingTitle')"
                  @click="chat.stop()"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
                <button
                  class="rag-drawer__icon-btn"
                  type="button"
                  :title="t('configureTokenTitle')"
                  @click="showTokenPanel = !showTokenPanel"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="7.5" cy="15.5" r="5.5" />
                    <path d="m12 12 8-8" />
                    <path d="m17 5 2 2" />
                    <path d="m15 7 2 2" />
                  </svg>
                </button>
                <button
                  class="rag-drawer__icon-btn"
                  type="button"
                  :title="t('clearLocalDataTitle')"
                  @click="openClearModal"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M6 6l1 14h10l1-14" />
                    <path d="M10 11v5" />
                    <path d="M14 11v5" />
                  </svg>
                </button>
                <button
                  class="rag-drawer__icon-btn"
                  type="button"
                  :title="t('closeTitle')"
                  @click="close"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            </header>

            <RAGTokenSetup
              v-if="showTokenPanel"
              @save="chat.saveToken($event); showTokenPanel = false"
              @cancel="showTokenPanel = false"
            />

            <template v-else>
              <RAGMessageList
                :messages="chat.messages.value"
                :is-streaming="chat.isStreaming.value"
                @retry="chat.retry()"
                @regenerate="chat.regenerateFromUser($event.id, $event.text)"
              />
              <RAGInput
                :disabled="chat.isStreaming.value"
                @send="chat.send($event)"
                @stop="chat.stop()"
              />
            </template>

            <Transition name="rag-modal-fade">
              <div
                v-if="showClearModal"
                class="rag-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="rag-clear-title"
                @click.self="closeClearModal"
              >
                <section class="rag-modal__panel">
                  <header class="rag-modal__header">
                    <div>
                      <h3 id="rag-clear-title">{{ t('clearModalTitle') }}</h3>
                      <p>{{ t('clearModalDescription') }}</p>
                    </div>
                    <button
                      class="rag-modal__close"
                      type="button"
                      :title="t('closeTitle')"
                      @click="closeClearModal"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </header>

                  <div class="rag-modal__choices">
                    <label class="rag-modal__choice">
                      <input v-model="shouldClearHistory" type="checkbox" />
                      <span>
                        <strong>{{ t('clearHistoryLabel') }}</strong>
                        <small>{{ t('clearHistoryDescription') }}</small>
                      </span>
                    </label>

                    <label class="rag-modal__choice">
                      <input v-model="shouldClearToken" type="checkbox" />
                      <span>
                        <strong>{{ t('clearTokenLabel') }}</strong>
                        <small>{{ t('clearTokenDescription') }}</small>
                      </span>
                    </label>
                  </div>

                  <footer class="rag-modal__footer">
                    <button class="rag-modal__btn rag-modal__btn--ghost" type="button" @click="closeClearModal">
                      {{ t('cancel') }}
                    </button>
                    <button
                      class="rag-modal__btn rag-modal__btn--danger"
                      type="button"
                      :disabled="!canConfirmClear"
                      @click="confirmClearLocalData"
                    >
                      {{ t('confirmClear') }}
                    </button>
                  </footer>
                </section>
              </div>
            </Transition>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.rag-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(20, 24, 33, 0.36);
  backdrop-filter: blur(2px);
}

.rag-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 460px;
  max-width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg);
  box-shadow: -18px 0 44px rgba(0, 0, 0, 0.18);
}

.rag-drawer__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 14px;
  border-bottom: 1px solid var(--vp-c-divider);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--vp-c-accent, var(--vp-c-brand, #3f7ef7)) 10%, transparent), transparent 46%),
    var(--vp-c-bg);
}

.rag-drawer__heading {
  min-width: 0;
}

.rag-drawer__eyebrow {
  display: block;
  margin-bottom: 3px;
  color: var(--vp-c-accent, var(--vp-c-brand, #3f7ef7));
  font-size: 12px;
  font-weight: 700;
}

.rag-drawer__title {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: 20px;
  line-height: 1.25;
  font-weight: 750;
}

.rag-drawer__status {
  margin: 6px 0 0;
  color: var(--vp-c-text-2);
  font-size: 12px;
  line-height: 1.4;
}

.rag-drawer__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.rag-drawer__icon-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 8px;
  background: color-mix(in srgb, var(--vp-c-bg-soft) 70%, transparent);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.rag-drawer__icon-btn:hover {
  border-color: color-mix(in srgb, var(--vp-c-accent, var(--vp-c-brand, #3f7ef7)) 28%, var(--vp-c-divider));
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-accent, var(--vp-c-brand, #3f7ef7));
}

.rag-modal {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(20, 24, 33, 0.28);
  backdrop-filter: blur(2px);
}

.rag-modal__panel {
  width: min(320px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  overflow: auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.18);
}

.rag-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.rag-modal__header h3 {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: 15px;
  line-height: 1.35;
}

.rag-modal__header p {
  margin: 5px 0 0;
  color: var(--vp-c-text-2);
  font-size: 12px;
  line-height: 1.5;
}

.rag-modal__close {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.rag-modal__close:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.rag-modal__choices {
  display: grid;
  gap: 8px;
  padding: 12px 14px 4px;
}

.rag-modal__choice {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 9px;
  align-items: flex-start;
  padding: 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  cursor: pointer;
}

.rag-modal__choice:hover {
  border-color: color-mix(in srgb, var(--vp-c-accent, var(--vp-c-brand, #3f7ef7)) 34%, var(--vp-c-divider));
  background: color-mix(in srgb, var(--vp-c-bg-soft) 58%, transparent);
}

.rag-modal__choice input {
  width: 16px;
  height: 16px;
  margin: 1px 0 0;
  accent-color: var(--vp-c-accent, var(--vp-c-brand, #3f7ef7));
}

.rag-modal__choice strong {
  display: block;
  color: var(--vp-c-text-1);
  font-size: 13px;
  line-height: 1.35;
}

.rag-modal__choice small {
  display: block;
  margin-top: 3px;
  color: var(--vp-c-text-2);
  font-size: 11px;
  line-height: 1.5;
}

.rag-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 14px 14px;
}

.rag-modal__btn {
  min-width: 76px;
  padding: 7px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.rag-modal__btn--ghost:hover {
  background: var(--vp-c-bg-soft);
}

.rag-modal__btn--danger {
  border-color: var(--vp-c-danger, #d5393e);
  background: var(--vp-c-danger, #d5393e);
  color: var(--vp-c-white, #ffffff);
}

.rag-modal__btn:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.rag-drawer-fade-enter-active,
.rag-drawer-fade-leave-active,
.rag-modal-fade-enter-active,
.rag-modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.rag-drawer-fade-enter-from,
.rag-drawer-fade-leave-to,
.rag-modal-fade-enter-from,
.rag-modal-fade-leave-to {
  opacity: 0;
}

.rag-drawer-slide-enter-active,
.rag-drawer-slide-leave-active {
  transition: transform 0.3s ease;
}

.rag-drawer-slide-enter-from,
.rag-drawer-slide-leave-to {
  transform: translateX(100%);
}

@media (max-width: 480px) {
  .rag-drawer {
    width: 100vw;
  }

  .rag-drawer__header {
    padding: 16px 14px 12px;
  }

  .rag-modal {
    padding: 16px;
  }
}
</style>
