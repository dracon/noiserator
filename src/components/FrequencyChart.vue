<script setup lang="ts">
import { computed } from 'vue'
import type { NotchBand } from '../composables/useNotchFilter'

const props = defineProps<{
  bands: NotchBand[]
  width?: number
  height?: number
}>()

const W = computed(() => props.width ?? 680)
const H = computed(() => props.height ?? 140)

const FS = 48000       // sample rate assumption
const MIN_F = 20
const MAX_F = 20000
const MIN_DB = -48
const MAX_DB = 6
const POINTS = 512

function freqToX(f: number): number {
  return (Math.log10(f / MIN_F) / Math.log10(MAX_F / MIN_F)) * W.value
}

function dbToY(db: number): number {
  return H.value - ((db - MIN_DB) / (MAX_DB - MIN_DB)) * H.value
}

function notchMagnitude(f: number, f0: number, Q: number): number {
  const w  = (2 * Math.PI * f)  / FS
  const w0 = (2 * Math.PI * f0) / FS
  const alpha = Math.sin(w0) / (2 * Q)

  const b0 = 1 / (1 + alpha)
  const b1 = (-2 * Math.cos(w0)) / (1 + alpha)
  const b2 = 1 / (1 + alpha)
  const a1 = (-2 * Math.cos(w0)) / (1 + alpha)
  const a2 = (1 - alpha) / (1 + alpha)

  const cosw  = Math.cos(w),  sinw  = Math.sin(w)
  const cos2w = Math.cos(2 * w), sin2w = Math.sin(2 * w)

  const nRe = b0 + b1 * cosw + b2 * cos2w
  const nIm = -(b1 * sinw + b2 * sin2w)
  const dRe = 1  + a1 * cosw + a2 * cos2w
  const dIm = -(a1 * sinw + a2 * sin2w)

  return Math.sqrt((nRe * nRe + nIm * nIm) / (dRe * dRe + dIm * dIm))
}

const responsePath = computed(() => {
  const activeBands = props.bands.filter(b => b.enabled)
  const pts: string[] = []

  for (let i = 0; i < POINTS; i++) {
    const t = i / (POINTS - 1)
    const f = MIN_F * Math.pow(MAX_F / MIN_F, t)
    let mag = 1
    for (const b of activeBands) mag *= notchMagnitude(f, b.frequency, b.q)
    const db = 20 * Math.log10(Math.max(mag, 1e-6))
    const x = (t * W.value)
    const y = dbToY(Math.max(MIN_DB, Math.min(MAX_DB, db)))
    pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
  }

  return pts.join(' ')
})

// Grid lines
const dbGridLines = [-36, -24, -12, 0]
const freqGridLines = [50, 100, 200, 500, 1000, 2000, 5000, 10000]

const zeroY = computed(() => dbToY(0))

// Marker lines for each band
const bandMarkers = computed(() =>
  props.bands.map(b => ({
    x: freqToX(b.frequency),
    enabled: b.enabled,
    label: b.frequency >= 1000
      ? `${(b.frequency / 1000).toFixed(1)}k`
      : `${Math.round(b.frequency)}`,
  }))
)
</script>

<template>
  <div class="chart-wrap">
    <svg
      :width="W"
      :height="H + 24"
      :viewBox="`0 0 ${W} ${H + 24}`"
    >
      <!-- Background -->
      <rect x="0" y="0" :width="W" :height="H" fill="#111116" rx="6" />

      <!-- dB grid lines -->
      <g v-for="db in dbGridLines" :key="db">
        <line
          :x1="0" :y1="dbToY(db)"
          :x2="W" :y2="dbToY(db)"
          stroke="#1e1e28" stroke-width="1"
        />
        <text
          :x="4" :y="dbToY(db) - 3"
          font-size="8" fill="#3a3a50" font-family="monospace"
        >{{ db }}dB</text>
      </g>

      <!-- 0dB line -->
      <line
        :x1="0" :y1="zeroY"
        :x2="W" :y2="zeroY"
        stroke="#2a2a3a" stroke-width="1" stroke-dasharray="4 3"
      />

      <!-- Freq grid lines -->
      <g v-for="f in freqGridLines" :key="f">
        <line
          :x1="freqToX(f)" :y1="0"
          :x2="freqToX(f)" :y2="H"
          stroke="#1e1e28" stroke-width="1"
        />
        <text
          :x="freqToX(f)" :y="H + 14"
          font-size="8" fill="#3a3a50" font-family="monospace" text-anchor="middle"
        >{{ f >= 1000 ? `${f/1000}k` : f }}</text>
      </g>

      <!-- Band marker lines -->
      <g v-for="m in bandMarkers" :key="m.x">
        <line
          :x1="m.x" y1="0"
          :x2="m.x" :y2="H"
          :stroke="m.enabled ? '#e066ff55' : '#ffffff18'"
          stroke-width="1"
          stroke-dasharray="3 3"
        />
      </g>

      <!-- Filled area under curve -->
      <path
        :d="`${responsePath} L ${W} ${H} L 0 ${H} Z`"
        fill="url(#chartFill)"
        opacity="0.3"
      />

      <!-- Response curve -->
      <path
        :d="responsePath"
        fill="none"
        stroke="url(#chartLine)"
        stroke-width="1.5"
        stroke-linejoin="round"
      />

      <defs>
        <linearGradient id="chartLine" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stop-color="#7c5cbf" />
          <stop offset="100%" stop-color="#00b8d9" />
        </linearGradient>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#9b7de0" />
          <stop offset="100%" stop-color="#9b7de000" />
        </linearGradient>
      </defs>
    </svg>
  </div>
</template>

<style scoped>
.chart-wrap {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
}
</style>
