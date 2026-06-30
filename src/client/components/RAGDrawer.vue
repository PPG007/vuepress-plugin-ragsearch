<script setup lang="ts">
import { useOptions } from '../options'
import { useDrawer } from '../composables/useDrawer'
import { useChat } from '../composables/useChat'
import RAGMessageList from './RAGMessageList.vue'
import RAGInput from './RAGInput.vue'
import RAGTokenSetup from './RAGTokenSetup.vue'

const options = useOptions()
const { isOpen, close } = useDrawer()
const chat = useChat(options)
</script>

<template>
  <Teleport to="body">
    <Transition name="rag-drawer-fade">
      <div v-if="isOpen" class="rag-overlay" @click.self="close">
        <Transition name="rag-drawer-slide">
          <div v-if="isOpen" class="rag-drawer">
            <div class="rag-drawer__header">
              <span class="rag-drawer__title">RAG 搜索</span>
              <button class="rag-drawer__close" @click="close">✕</button>
            </div>

            <RAGTokenSetup
              v-if="chat.needsSetup.value"
              @save="chat.saveToken($event)"
            />
            <template v-else>
              <RAGMessageList
                :messages="chat.messages.value"
                @retry="chat.retry()"
              />
              <RAGInput
                :disabled="chat.isStreaming.value"
                @send="chat.send($event)"
              />
            </template>
          </div>
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
  background: rgba(0, 0, 0, 0.3);
}
.rag-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 440px;
  max-width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
}
.rag-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--vp-c-divider);
}
.rag-drawer__title { font-size: 15px; font-weight: 600; color: var(--vp-c-text-1); }
.rag-drawer__close {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border: none; border-radius: 6px;
  background: none; color: var(--vp-c-text-2);
  font-size: 16px; cursor: pointer;
}
.rag-drawer__close:hover { background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); }

/* Transitions */
.rag-drawer-fade-enter-active,
.rag-drawer-fade-leave-active { transition: opacity 0.25s ease; }
.rag-drawer-fade-enter-from,
.rag-drawer-fade-leave-to { opacity: 0; }

.rag-drawer-slide-enter-active,
.rag-drawer-slide-leave-active { transition: transform 0.3s ease; }
.rag-drawer-slide-enter-from,
.rag-drawer-slide-leave-to { transform: translateX(100%); }
</style>
