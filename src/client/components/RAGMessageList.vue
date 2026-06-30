<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { ChatMessage } from '../../types'
import RAGMessage from './RAGMessage.vue'

const props = defineProps<{
  messages: ChatMessage[]
}>()

defineEmits<{ retry: [] }>()

const listRef = ref<HTMLElement | null>(null)

watch(
  () => props.messages.length,
  async () => { await nextTick(); listRef.value?.scrollTo({ top: listRef.value.scrollHeight, behavior: 'smooth' }) }
)

watch(
  () => props.messages[props.messages.length - 1]?.content,
  async () => { await nextTick(); listRef.value?.scrollTo({ top: listRef.value.scrollHeight, behavior: 'auto' }) }
)
</script>

<template>
  <div ref="listRef" class="rag-list">
    <div v-if="messages.length === 0" class="rag-list__empty">
      基于文档提问，AI 帮你找到答案
    </div>
    <RAGMessage
      v-for="msg in messages"
      :key="msg.id"
      :message="msg"
      @retry="$emit('retry')"
    />
  </div>
</template>

<style scoped>
.rag-list { flex: 1; overflow-y: auto; padding: 8px 0; }
.rag-list__empty { text-align: center; padding: 60px 24px; color: var(--vp-c-text-2); font-size: 14px; }
</style>
