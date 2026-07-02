<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useOptions } from '../options'
import { useDrawer } from '../composables/useDrawer'
import { useI18n } from '../composables/useI18n'
import { applyRAGSearchTheme } from '../theme'
import RAGDrawer from './RAGDrawer.vue'

interface BubblePosition {
  x: number
  y: number
}

interface DragState {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
  moved: boolean
}

const BUBBLE_SIZE = 56
const DEFAULT_MARGIN = 20
const EDGE_MARGIN = 12
const DRAG_THRESHOLD = 4

const options = useOptions()
const { isOpen, open } = useDrawer()
const { t } = useI18n(options)

const position = ref<BubblePosition | null>(null)
const isDragging = ref(false)
const suppressNextClick = ref(false)
let dragState: DragState | null = null

const bubbleStyle = computed(() => {
  if (!position.value) return undefined

  return {
    left: `${position.value.x}px`,
    top: `${position.value.y}px`,
    right: 'auto',
    bottom: 'auto',
  }
})

function getDefaultPosition(): BubblePosition {
  return clampPosition({
    x: window.innerWidth - BUBBLE_SIZE - DEFAULT_MARGIN,
    y: window.innerHeight - BUBBLE_SIZE - DEFAULT_MARGIN,
  })
}

function clampPosition(nextPosition: BubblePosition): BubblePosition {
  const maxX = Math.max(EDGE_MARGIN, window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN)
  const maxY = Math.max(EDGE_MARGIN, window.innerHeight - BUBBLE_SIZE - EDGE_MARGIN)

  return {
    x: Math.min(Math.max(nextPosition.x, EDGE_MARGIN), maxX),
    y: Math.min(Math.max(nextPosition.y, EDGE_MARGIN), maxY),
  }
}

function ensurePosition(): BubblePosition {
  const nextPosition = position.value ? clampPosition(position.value) : getDefaultPosition()
  position.value = nextPosition
  return nextPosition
}

function onResize() {
  if (!position.value) return
  position.value = clampPosition(position.value)
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return

  const currentPosition = ensurePosition()
  dragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: currentPosition.x,
    originY: currentPosition.y,
    moved: false,
  }
  isDragging.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!dragState || dragState.pointerId !== event.pointerId) return

  const deltaX = event.clientX - dragState.startX
  const deltaY = event.clientY - dragState.startY

  if (!dragState.moved && Math.hypot(deltaX, deltaY) >= DRAG_THRESHOLD) {
    dragState.moved = true
  }

  if (!dragState.moved) return

  event.preventDefault()
  position.value = clampPosition({
    x: dragState.originX + deltaX,
    y: dragState.originY + deltaY,
  })
}

function finishPointer(event: PointerEvent) {
  if (!dragState || dragState.pointerId !== event.pointerId) return

  if (dragState.moved) {
    suppressNextClick.value = true
    window.setTimeout(() => {
      suppressNextClick.value = false
    })
  }

  isDragging.value = false
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
  dragState = null
}

function onClick(event: MouseEvent) {
  if (suppressNextClick.value) {
    event.preventDefault()
    event.stopPropagation()
    suppressNextClick.value = false
    return
  }

  open()
}

onMounted(() => {
  if (Object.prototype.hasOwnProperty.call(options, 'themeColor')) {
    applyRAGSearchTheme(options.themeColor)
  }

  ensurePosition()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <button
    class="rag-search-bubble"
    :class="{
      'rag-search-bubble--hidden': isOpen,
      'rag-search-bubble--dragging': isDragging,
    }"
    :style="bubbleStyle"
    type="button"
    :title="t('searchButtonTitle')"
    :aria-label="t('searchButtonTitle')"
    @click="onClick"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="finishPointer"
    @pointercancel="finishPointer"
  >
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
    <span class="rag-search-bubble__sr">{{ t('searchButtonText') }}</span>
  </button>
  <RAGDrawer />
</template>

<style scoped>
.rag-search-bubble {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 900;
  width: 56px;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--rag-c-accent, var(--vp-c-accent, var(--vp-c-brand, #3f7ef7))) 72%, transparent);
  border-radius: 50%;
  background: var(--rag-c-accent, var(--vp-c-accent, var(--vp-c-brand, #3f7ef7)));
  color: var(--vp-c-accent-text, var(--vp-c-white, #ffffff));
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  font-family: inherit;
  touch-action: none;
  user-select: none;
  transition: box-shadow 0.2s ease, filter 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
}

.rag-search-bubble:hover {
  filter: brightness(1.05);
  transform: translateY(-1px);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.24);
}

.rag-search-bubble--dragging {
  filter: brightness(1.04);
  transform: scale(1.03);
  box-shadow: 0 20px 46px rgba(0, 0, 0, 0.26);
}

.rag-search-bubble--hidden {
  opacity: 0;
  pointer-events: none;
}

.rag-search-bubble__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
