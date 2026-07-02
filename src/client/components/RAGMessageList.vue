<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { ChatMessage } from '../../types'
import { useOptions } from '../options'
import { useI18n } from '../composables/useI18n'
import RAGMessage from './RAGMessage.vue'

const props = defineProps<{
  messages: ChatMessage[]
  isStreaming: boolean
}>()

defineEmits<{
  retry: []
  regenerate: [{ id: string; text: string }]
}>()

const BOTTOM_THRESHOLD = 48

const listRef = ref<HTMLElement | null>(null)
const isNearBottom = ref(true)
const followOutput = ref(true)
const options = useOptions()
const { t } = useI18n(options)
const showScrollButton = computed(() => props.messages.length > 0 && !isNearBottom.value)
const editableUserId = computed(() => {
  if (props.isStreaming) return ''

  for (let i = props.messages.length - 1; i >= 0; i -= 1) {
    if (props.messages[i].role === 'user') return props.messages[i].id
  }

  return ''
})

async function scrollToBottom(behavior: ScrollBehavior, enableFollow = false) {
  if (enableFollow) {
    followOutput.value = true
  }

  await nextTick()
  listRef.value?.scrollTo({ top: listRef.value.scrollHeight, behavior })
  requestAnimationFrame(() => updateScrollState())
}

function updateScrollState(isUserScroll = false) {
  const list = listRef.value
  if (!list) return

  const distanceToBottom = list.scrollHeight - list.scrollTop - list.clientHeight
  isNearBottom.value = distanceToBottom <= BOTTOM_THRESHOLD

  if (isUserScroll) {
    followOutput.value = isNearBottom.value
  }
}

function onScroll() {
  updateScrollState(true)
}

function maybeFollowOutput(behavior: ScrollBehavior) {
  if (!followOutput.value && !isNearBottom.value) return
  scrollToBottom(behavior)
}

watch(
  () => props.messages.length,
  () => maybeFollowOutput('smooth'),
)

watch(
  () => props.messages[props.messages.length - 1]?.content,
  () => {
    if (props.isStreaming && followOutput.value) {
      scrollToBottom('auto')
      return
    }

    updateScrollState()
  },
)

watch(
  () => props.messages[props.messages.length - 1]?.phase,
  () => {
    if (props.isStreaming && followOutput.value) {
      scrollToBottom('auto')
      return
    }

    updateScrollState()
  },
)

onMounted(() => {
  scrollToBottom('auto', true)
})
</script>

<template>
  <div class="rag-list-shell">
    <div ref="listRef" class="rag-list" @scroll.passive="onScroll">
      <div v-if="messages.length === 0" class="rag-list__empty">
        <div class="rag-list__empty-icon" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <h3>{{ t('emptyTitle') }}</h3>
        <p>{{ t('emptyDescription') }}</p>
      </div>
      <RAGMessage
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        :can-edit="msg.id === editableUserId"
        @retry="$emit('retry')"
        @regenerate="$emit('regenerate', $event)"
      />
    </div>

    <Transition name="rag-scroll-btn">
      <button
        v-if="showScrollButton"
        class="rag-list__scroll-btn"
        type="button"
        :title="t('scrollToBottomTitle')"
        :aria-label="t('scrollToBottomTitle')"
        @click="scrollToBottom('smooth', true)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14" />
          <path d="m19 12-7 7-7-7" />
        </svg>
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.rag-list-shell {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
}

.rag-list {
  flex: 1;
  overflow-y: auto;
  padding: 14px 0 10px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--vp-c-bg-soft) 42%, transparent), transparent 190px),
    var(--vp-c-bg);
}

.rag-list__scroll-btn {
  --rag-c-accent: var(--vp-c-accent, var(--vp-c-brand, #3f7ef7));
  position: absolute;
  right: 18px;
  bottom: 14px;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--rag-c-accent) 28%, var(--vp-c-divider));
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--rag-c-accent);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.14);
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.rag-list__scroll-btn:hover {
  transform: translateY(-1px);
  border-color: var(--rag-c-accent);
  background: var(--vp-c-bg-soft);
}

.rag-list__empty {
  display: flex;
  min-height: 58%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 42px 30px;
  text-align: center;
  color: var(--vp-c-text-2);
}

.rag-list__empty-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  border: 1px solid color-mix(in srgb, var(--vp-c-brand) 26%, var(--vp-c-divider));
  border-radius: 8px;
  background: color-mix(in srgb, var(--vp-c-brand) 10%, var(--vp-c-bg));
  color: var(--vp-c-brand);
}

.rag-list__empty h3 {
  margin: 0 0 8px;
  color: var(--vp-c-text-1);
  font-size: 18px;
  line-height: 1.35;
}

.rag-list__empty p {
  max-width: 280px;
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
}

.rag-scroll-btn-enter-active,
.rag-scroll-btn-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.rag-scroll-btn-enter-from,
.rag-scroll-btn-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
