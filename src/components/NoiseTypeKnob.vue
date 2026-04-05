<script setup lang="ts">
import { ref, computed } from 'vue'
import type { NoiseType } from '../composables/useNoiseEngine'

const props = defineProps<{
  modelValue: NoiseType
  noiseTypes: NoiseType[]
  size?: number
  color?: string
  focused?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: NoiseType]
}>()

const size = computed(() => props.size ?? 80)
const color = computed(() => props.color ?? '#4ecdc4')

const currentIndex = computed(() => props.noiseTypes.indexOf(props.modelValue))

const MIN_ANGLE = -135
const MAX_ANGLE = 135

const angleForIndex = (i: number) =>
  MIN_ANGLE + (i / (props.noiseTypes.length - 1)) * (MAX_ANGLE - MIN_ANGLE)

const angle = computed(() => angleForIndex(currentIndex.value))

// Drag / click detection
const dragging = ref(false)
let startY = 0
let startIndex = 0
let moved = false

function onPointerDown(e: PointerEvent) {
  dragging.value = true
  moved = false
  startY = e.clientY
  startIndex = currentIndex.value
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  e.preventDefault()
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  const dy = startY - e.clientY
  if (Math.abs(dy) > 5) moved = true
  const steps = Math.round((dy / 60) * (props.noiseTypes.length - 1))
  const idx = Math.min(props.noiseTypes.length - 1, Math.max(0, startIndex + steps))
  emit('update:modelValue', props.noiseTypes[idx])
}

function onPointerUp() {
  if (!moved) {
    const next = (currentIndex.value + 1) % props.noiseTypes.length
    emit('update:modelValue', props.noiseTypes[next])
  }
  dragging.value = false
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const dir = e.deltaY < 0 ? 1 : -1
  const next = (currentIndex.value + dir + props.noiseTypes.length) % props.noiseTypes.length
  emit('update:modelValue', props.noiseTypes[next])
}

// SVG
const cx = computed(() => size.value / 2)
const cy = computed(() => size.value / 2)
const r = computed(() => size.value / 2 - 6)
const trackR = computed(() => r.value - 4)

function polarToXY(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx.value + radius * Math.cos(rad), y: cy.value + radius * Math.sin(rad) }
}

const trackPath = computed(() => {
  const s = polarToXY(MIN_ANGLE, trackR.value)
  const e = polarToXY(MAX_ANGLE, trackR.value)
  return `M ${s.x} ${s.y} A ${trackR.value} ${trackR.value} 0 1 1 ${e.x} ${e.y}`
})

const dotPos = computed(() => polarToXY(angle.value, r.value - 8))

const notches = computed(() =>
  props.noiseTypes.map((_, i) => ({
    outer: polarToXY(angleForIndex(i), trackR.value + 5),
    inner: polarToXY(angleForIndex(i), trackR.value - 5),
    active: i === currentIndex.value,
  }))
)

const noiseLabels: Record<NoiseType, string> = {
  white: 'WHITE',
  pink: 'PINK',
  brown: 'BROWN',
}
</script>

<template>
  <div
    class="knob-wrap"
    :class="{ dragging }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @wheel.prevent="onWheel"
  >
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="knob-svg">
      <circle
        v-if="focused"
        :cx="cx" :cy="cy" :r="r + 2"
        fill="none"
        :stroke="color"
        stroke-width="1.5"
        class="focus-ring"
      />
      <circle :cx="cx" :cy="cy" :r="r" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="2" />
      <path :d="trackPath" fill="none" stroke="#2a2a35" stroke-width="4" stroke-linecap="round" />
      <line
        v-for="(n, i) in notches"
        :key="i"
        :x1="n.inner.x" :y1="n.inner.y"
        :x2="n.outer.x" :y2="n.outer.y"
        :stroke="n.active ? color : '#3a3a4a'"
        stroke-width="2"
        stroke-linecap="round"
      />
      <circle :cx="cx" :cy="cy" :r="r - 10" fill="url(#knobGrad3)" stroke="#3a3a4a" stroke-width="1.5" />
      <circle
        :cx="dotPos.x" :cy="dotPos.y" :r="3"
        :fill="color"
        :filter="`drop-shadow(0 0 3px ${color})`"
      />
      <defs>
        <radialGradient id="knobGrad3" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#2e2e3c" />
          <stop offset="100%" stop-color="#18181f" />
        </radialGradient>
      </defs>
    </svg>
    <div class="knob-label">NOISE</div>
    <div class="knob-value">{{ noiseLabels[modelValue] }}</div>
  </div>
</template>

<style scoped>
.knob-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  user-select: none;
  cursor: ns-resize;
}

.knob-wrap.dragging .knob-svg {
  filter: brightness(1.15);
}

.knob-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-dim);
}

.knob-value {
  font-size: 12px;
  color: var(--text);
  min-width: 50px;
  text-align: center;
}

.focus-ring {
  animation: focus-pulse 1.2s ease-in-out infinite alternate;
}

@keyframes focus-pulse {
  0%   { opacity: 0.4; }
  100% { opacity: 0.9; }
}
</style>
