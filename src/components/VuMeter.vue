<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps<{
  analyserNode: AnalyserNode | null
  height?: number
  segments?: number
}>()

const trackH = computed(() => props.height ?? 160)
const segCount = computed(() => props.segments ?? 20)

// Smoothed RMS level 0–1
const smoothed = ref(0)
let rafId = 0
let _smoothed = 0

function tick() {
  if (!props.analyserNode) {
    _smoothed = 0
    smoothed.value = 0
    return
  }
  const buf = new Uint8Array(props.analyserNode.fftSize)
  props.analyserNode.getByteTimeDomainData(buf)
  let sum = 0
  for (let i = 0; i < buf.length; i++) {
    const s = (buf[i] - 128) / 128
    sum += s * s
  }
  const rms = Math.sqrt(sum / buf.length)
  // Fast attack, slow release
  _smoothed = rms > _smoothed
    ? _smoothed * 0.2 + rms * 0.8
    : _smoothed * 0.88 + rms * 0.12
  smoothed.value = _smoothed
  rafId = requestAnimationFrame(tick)
}

watch(() => props.analyserNode, node => {
  cancelAnimationFrame(rafId)
  _smoothed = 0
  smoothed.value = 0
  if (node) rafId = requestAnimationFrame(tick)
}, { immediate: true })

onUnmounted(() => cancelAnimationFrame(rafId))

// Map RMS → lit segment count via dBFS (-60 to 0 range)
const litCount = computed(() => {
  const v = smoothed.value
  if (v <= 0) return 0
  const dBFS = Math.max(-60, 20 * Math.log10(v))
  return Math.ceil((dBFS + 60) / 60 * segCount.value)
})

function isLit(i: number) {
  return (segCount.value - i + 1) <= litCount.value
}

// Standard VU meter zones: top 10% red, next 20% yellow, bottom 70% green
// Based on EBU/IEC PPM convention adapted for dBFS scale
function segColor(i: number) {
  const pos = i / segCount.value  // 0 = top segment, 1 = bottom
  if (pos <= 0.10) return '#ff2222'
  if (pos <= 0.30) return '#ffaa00'
  return '#22dd55'
}

function segStyle(i: number) {
  if (!isLit(i)) return {}
  const c = segColor(i)
  return { background: c, boxShadow: `0 0 4px ${c}` }
}
</script>

<template>
  <div class="vu-meter" :style="{ height: `${trackH}px` }">
    <div
      v-for="i in segCount"
      :key="i"
      class="seg"
      :style="segStyle(i)"
    />
  </div>
</template>

<style scoped>
.vu-meter {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 14px;
}

.seg {
  flex: 1;
  border-radius: 2px;
  background: var(--border);
}
</style>
