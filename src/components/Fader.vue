<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  modelValue: number
  color?: string
  label?: string
  height?: number
  segments?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const color = computed(() => props.color ?? '#7c5cbf')
const trackH = computed(() => props.height ?? 160)
const segCount = computed(() => props.segments ?? 20)
const litCount = computed(() => Math.round(props.modelValue * segCount.value))
const thumbOffset = computed(() => (1 - props.modelValue) * trackH.value)
const displayPct = computed(() => Math.round(props.modelValue * 100))

function isLit(i: number) {
  // i=1 is top (max), i=segCount is bottom (min); light from bottom up
  return (segCount.value - i + 1) <= litCount.value
}

const el = ref<HTMLElement | null>(null)
const trackEl = ref<HTMLElement | null>(null)
const dragging = ref(false)

function updateFromEvent(e: PointerEvent) {
  if (!trackEl.value) return
  const rect = trackEl.value.getBoundingClientRect()
  const newVal = Math.min(1, Math.max(0, 1 - (e.clientY - rect.top) / rect.height))
  emit('update:modelValue', newVal)
}

function onPointerDown(e: PointerEvent) {
  dragging.value = true
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  updateFromEvent(e)
  e.preventDefault()
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  updateFromEvent(e)
}

function onPointerUp() {
  dragging.value = false
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY < 0 ? 0.02 : -0.02
  emit('update:modelValue', Math.min(1, Math.max(0, props.modelValue + delta)))
}

onMounted(() => el.value?.addEventListener('wheel', onWheel, { passive: false }))
onUnmounted(() => el.value?.removeEventListener('wheel', onWheel))
</script>

<template>
  <div ref="el" class="fader-wrap" :class="{ dragging }">
    <div class="fader-value">{{ displayPct }}</div>
    <div
      ref="trackEl"
      class="fader-track"
      :style="{ height: `${trackH}px` }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div class="seg-col">
        <div
          v-for="i in segCount"
          :key="i"
          class="seg"
          :style="isLit(i) ? { background: color, boxShadow: `0 0 3px ${color}` } : {}"
        />
      </div>
      <div class="thumb" :style="{ top: `${thumbOffset}px` }" />
    </div>
    <div class="fader-label">{{ label }}</div>
  </div>
</template>

<style scoped>
.fader-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  user-select: none;
}

.fader-value {
  font-size: 11px;
  color: var(--text);
  letter-spacing: 0.04em;
  min-width: 28px;
  text-align: center;
}

.fader-track {
  position: relative;
  width: 36px;
  cursor: ns-resize;
}

.fader-wrap.dragging .fader-track {
  cursor: grabbing;
}

.seg-col {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.seg {
  flex: 1;
  border-radius: 2px;
  background: var(--border);
}

.thumb {
  position: absolute;
  left: -8px;
  right: -8px;
  height: 14px;
  background: #c0c0cc;
  border-radius: 4px;
  transform: translateY(-50%);
  pointer-events: none;
  z-index: 1;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.fader-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-dim);
}
</style>
