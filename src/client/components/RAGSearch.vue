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
const tooltipId = 'rag-search-bubble-tooltip'

const isMounted = ref(false)
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
  isMounted.value = true
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <template v-if="isMounted">
    <button
      class="rag-search-bubble"
      :class="{
        'rag-search-bubble--hidden': isOpen,
        'rag-search-bubble--dragging': isDragging,
      }"
      :style="bubbleStyle"
      type="button"
      :title="t('searchButtonTooltip')"
      :aria-label="t('searchButtonTitle')"
      :aria-describedby="tooltipId"
      @click="onClick"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="finishPointer"
      @pointercancel="finishPointer"
    >
      <svg
        class="rag-search-bubble__icon"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M0 0h24v24H0z" fill="none" />
        <path
          fill="none"
          stroke="currentColor"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 19c1.2-3.678 2.526-5.005 6-6c-3.474-.995-4.8-2.322-6-6c-1.2 3.678-2.526 5.005-6 6c3.474.995 4.8 2.322 6 6Zm-8-9c.6-1.84 1.263-2.503 3-3c-1.737-.497-2.4-1.16-3-3c-.6 1.84-1.263 2.503-3 3c1.737.497 2.4 1.16 3 3Zm1.5 10c.3-.92.631-1.251 1.5-1.5c-.869-.249-1.2-.58-1.5-1.5c-.3.92-.631 1.251-1.5 1.5c.869.249 1.2.58 1.5 1.5Z"
        />
      </svg>
      <span :id="tooltipId" class="rag-search-bubble__tooltip" role="tooltip">
        {{ t('searchButtonTooltip') }}
      </span>
      <span class="rag-search-bubble__sr">{{ t('searchButtonText') }}</span>
    </button>
    <RAGDrawer />
  </template>
</template>

<style scoped>
.rag-search-bubble {
  --rag-c-accent-color: var(--rag-c-accent, var(--vp-c-accent, var(--vp-c-brand, #3f7ef7)));
  --rag-c-on-accent-color: var(--vp-c-white, #ffffff);
  --rag-c-tooltip-bg-color: var(--vp-c-bg-elv, var(--vp-c-bg, Canvas));
  --rag-c-tooltip-border-color: var(--vp-c-divider, color-mix(in srgb, CanvasText 18%, Canvas));
  --rag-c-tooltip-text-color: var(--vp-c-text-1, CanvasText);
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
  border: 1px solid color-mix(in srgb, var(--rag-c-accent-color) 72%, transparent);
  border-radius: 50%;
  background: var(--rag-c-accent-color);
  color: var(--rag-c-on-accent-color);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  font-family: inherit;
  touch-action: none;
  user-select: none;
  transition: box-shadow 0.2s ease, filter 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
}

.rag-search-bubble__icon {
  flex-shrink: 0;
}

.rag-search-bubble__tooltip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 10px);
  padding: 5px 9px;
  border: 1px solid var(--rag-c-tooltip-border-color);
  border-radius: 6px;
  background: var(--rag-c-tooltip-bg-color);
  color: var(--rag-c-tooltip-text-color);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.16);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 4px);
  transition: opacity 0.16s ease, transform 0.16s ease;
  white-space: nowrap;
}

.rag-search-bubble__tooltip::after {
  position: absolute;
  left: 50%;
  bottom: -5px;
  width: 8px;
  height: 8px;
  border-right: 1px solid var(--rag-c-tooltip-border-color);
  border-bottom: 1px solid var(--rag-c-tooltip-border-color);
  background: var(--rag-c-tooltip-bg-color);
  content: '';
  transform: translateX(-50%) rotate(45deg);
}

.rag-search-bubble:hover .rag-search-bubble__tooltip,
.rag-search-bubble:focus-visible .rag-search-bubble__tooltip {
  opacity: 1;
  transform: translate(-50%, 0);
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
