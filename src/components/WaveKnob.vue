<script setup lang="ts">
import { ref, computed } from 'vue'
import type { WaveType } from '../composables/useAudioEngine'

const props = defineProps<{
  modelValue: WaveType
  waves: WaveType[]
  size?: number
  color?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: WaveType]
}>()

const size = computed(() => props.size ?? 80)
const color = computed(() => props.color ?? '#7c5cbf')

const currentIndex = computed(() => props.waves.indexOf(props.modelValue))

// 4 positions spread over 270° arc, starting at -135°
const MIN_ANGLE = -135
const MAX_ANGLE = 135

const angleForIndex = (i: number) =>
  MIN_ANGLE + (i / (props.waves.length - 1)) * (MAX_ANGLE - MIN_ANGLE)

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
  const steps = Math.round((dy / 60) * (props.waves.length - 1))
  const idx = Math.min(props.waves.length - 1, Math.max(0, startIndex + steps))
  emit('update:modelValue', props.waves[idx])
}

function onPointerUp() {
  if (!moved) {
    // click: advance to next wave
    const next = (currentIndex.value + 1) % props.waves.length
    emit('update:modelValue', props.waves[next])
  }
  dragging.value = false
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const dir = e.deltaY < 0 ? 1 : -1
  const next = (currentIndex.value + dir + props.waves.length) % props.waves.length
  emit('update:modelValue', props.waves[next])
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
  props.waves.map((_, i) => ({
    outer: polarToXY(angleForIndex(i), trackR.value + 5),
    inner: polarToXY(angleForIndex(i), trackR.value - 5),
    active: i === currentIndex.value,
  }))
)

// Wave display names
const waveLabels: Record<WaveType, string> = {
  sine: 'SINE',
  square: 'SQR',
  sawtooth: 'SAW',
  triangle: 'TRI',
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
      <!-- Outer ring -->
      <circle :cx="cx" :cy="cy" :r="r" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="2" />
      <!-- Background track -->
      <path :d="trackPath" fill="none" stroke="#2a2a35" stroke-width="4" stroke-linecap="round" />
      <!-- Notch marks for each wave -->
      <line
        v-for="(n, i) in notches"
        :key="i"
        :x1="n.inner.x" :y1="n.inner.y"
        :x2="n.outer.x" :y2="n.outer.y"
        :stroke="n.active ? color : '#3a3a4a'"
        stroke-width="2"
        stroke-linecap="round"
      />
      <!-- Knob body -->
      <circle :cx="cx" :cy="cy" :r="r - 10" fill="url(#knobGrad2)" stroke="#3a3a4a" stroke-width="1.5" />
      <!-- Indicator dot -->
      <circle
        :cx="dotPos.x" :cy="dotPos.y" :r="3"
        :fill="color"
        :filter="`drop-shadow(0 0 3px ${color})`"
      />
      <defs>
        <radialGradient id="knobGrad2" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#2e2e3c" />
          <stop offset="100%" stop-color="#18181f" />
        </radialGradient>
      </defs>
    </svg>
    <div class="knob-label">WAVE</div>
    <div class="knob-value">{{ waveLabels[modelValue] }}</div>
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
</style>
