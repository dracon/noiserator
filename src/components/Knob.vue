<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  modelValue: number
  min: number
  max: number
  label: string
  unit?: string
  decimals?: number
  size?: number
  color?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const size = computed(() => props.size ?? 80)
const color = computed(() => props.color ?? '#7c5cbf')

// Knob goes from -135° to +135° (270° total arc)
const MIN_ANGLE = -135
const MAX_ANGLE = 135

const angle = computed(() => {
  const t = (props.modelValue - props.min) / (props.max - props.min)
  return MIN_ANGLE + t * (MAX_ANGLE - MIN_ANGLE)
})

const displayValue = computed(() => {
  const dec = props.decimals ?? 0
  return props.modelValue.toFixed(dec)
})

// Drag logic
const dragging = ref(false)
let startY = 0
let startValue = 0
const sensitivity = 0.5 // px per unit percentage

function onPointerDown(e: PointerEvent) {
  dragging.value = true
  startY = e.clientY
  startValue = props.modelValue
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  e.preventDefault()
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  const dy = startY - e.clientY // up = increase
  const range = props.max - props.min
  const delta = (dy / 150) * range
  const newVal = Math.min(props.max, Math.max(props.min, startValue + delta))
  emit('update:modelValue', newVal)
}

function onPointerUp() {
  dragging.value = false
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const range = props.max - props.min
  const step = range / 100
  const delta = e.deltaY < 0 ? step : -step
  const newVal = Math.min(props.max, Math.max(props.min, props.modelValue + delta))
  emit('update:modelValue', newVal)
}

const el = ref<HTMLElement | null>(null)

onMounted(() => {
  el.value?.addEventListener('wheel', onWheel, { passive: false })
})
onUnmounted(() => {
  el.value?.removeEventListener('wheel', onWheel)
})

// SVG helpers
const cx = computed(() => size.value / 2)
const cy = computed(() => size.value / 2)
const r = computed(() => size.value / 2 - 6)
const trackR = computed(() => r.value - 4)

function polarToXY(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx.value + radius * Math.cos(rad),
    y: cy.value + radius * Math.sin(rad),
  }
}

const arcPath = computed(() => {
  const start = polarToXY(MIN_ANGLE, trackR.value)
  const end = polarToXY(angle.value, trackR.value)
  const large = angle.value - MIN_ANGLE > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${trackR.value} ${trackR.value} 0 ${large} 1 ${end.x} ${end.y}`
})

const trackPath = computed(() => {
  const start = polarToXY(MIN_ANGLE, trackR.value)
  const end = polarToXY(MAX_ANGLE, trackR.value)
  return `M ${start.x} ${start.y} A ${trackR.value} ${trackR.value} 0 1 1 ${end.x} ${end.y}`
})

const dotPos = computed(() => polarToXY(angle.value, r.value - 8))
</script>

<template>
  <div
    ref="el"
    class="knob-wrap"
    :class="{ dragging }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <svg
      :width="size"
      :height="size"
      :viewBox="`0 0 ${size} ${size}`"
      class="knob-svg"
    >
      <!-- Outer glow ring -->
      <circle
        :cx="cx" :cy="cy" :r="r"
        fill="none"
        stroke="rgba(255,255,255,0.04)"
        :stroke-width="2"
      />
      <!-- Background track -->
      <path
        :d="trackPath"
        fill="none"
        stroke="#2a2a35"
        :stroke-width="4"
        stroke-linecap="round"
      />
      <!-- Active arc -->
      <path
        :d="arcPath"
        fill="none"
        :stroke="color"
        :stroke-width="4"
        stroke-linecap="round"
        :filter="`drop-shadow(0 0 4px ${color})`"
      />
      <!-- Knob body -->
      <circle
        :cx="cx" :cy="cy" :r="r - 10"
        fill="url(#knobGrad)"
        stroke="#3a3a4a"
        stroke-width="1.5"
      />
      <!-- Indicator dot -->
      <circle
        :cx="dotPos.x" :cy="dotPos.y" :r="3"
        :fill="color"
        :filter="`drop-shadow(0 0 3px ${color})`"
      />
      <defs>
        <radialGradient id="knobGrad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#2e2e3c" />
          <stop offset="100%" stop-color="#18181f" />
        </radialGradient>
      </defs>
    </svg>
    <div class="knob-label">{{ label }}</div>
    <div class="knob-value">{{ displayValue }}<span v-if="unit" class="knob-unit">{{ unit }}</span></div>
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

.knob-unit {
  font-size: 9px;
  color: var(--text-dim);
  margin-left: 2px;
}
</style>
