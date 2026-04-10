<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  analyserNode: AnalyserNode | null
  color?: string
  width?: number
  height?: number
}>(), {
  color: '#7c5cbf',
  width: 680,
  height: 96,
})

const canvas = ref<HTMLCanvasElement | null>(null)
let animFrameId = 0
let dataArray: Uint8Array<ArrayBuffer> | null = null

const LOG_MIN = Math.log10(20)
const LOG_MAX = Math.log10(20000)

function draw() {
  const cvs = canvas.value
  if (!cvs) return
  const ctx = cvs.getContext('2d')
  if (!ctx) return

  const w = props.width
  const h = props.height

  ctx.clearRect(0, 0, w, h)

  if (!props.analyserNode) {
    // Draw a dim baseline when not running
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    ctx.moveTo(0, h - 1)
    ctx.lineTo(w, h - 1)
    ctx.stroke()
    return
  }

  const analyser = props.analyserNode
  const bufLen = analyser.frequencyBinCount
  if (!dataArray || dataArray.length !== bufLen) {
    dataArray = new Uint8Array(new ArrayBuffer(bufLen))
  }
  analyser.getByteFrequencyData(dataArray)

  const sampleRate = analyser.context.sampleRate
  const fftSize = analyser.fftSize
  const hzPerBin = sampleRate / fftSize

  // Parse color for gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, props.color)
  gradient.addColorStop(1, props.color + '33')

  ctx.beginPath()
  ctx.moveTo(0, h)

  for (let x = 0; x < w; x++) {
    const freq = Math.pow(10, LOG_MIN + (x / w) * (LOG_MAX - LOG_MIN))
    const bin = Math.min(Math.round(freq / hzPerBin), bufLen - 1)
    const amplitude = dataArray[bin]
    const barH = (amplitude / 255) * h
    ctx.lineTo(x, h - barH)
  }

  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fillStyle = gradient
  ctx.fill()

  // Subtle top-line stroke
  ctx.beginPath()
  for (let x = 0; x < w; x++) {
    const freq = Math.pow(10, LOG_MIN + (x / w) * (LOG_MAX - LOG_MIN))
    const bin = Math.min(Math.round(freq / hzPerBin), bufLen - 1)
    const amplitude = dataArray[bin]
    const barH = (amplitude / 255) * h
    if (x === 0) ctx.moveTo(x, h - barH)
    else ctx.lineTo(x, h - barH)
  }
  ctx.strokeStyle = props.color
  ctx.lineWidth = 1.5
  ctx.stroke()
}

function loop() {
  draw()
  animFrameId = requestAnimationFrame(loop)
}

function stopLoop() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId)
    animFrameId = 0
  }
}

function startLoop() {
  stopLoop()
  loop()
}

watch(() => props.analyserNode, (node) => {
  dataArray = null
  if (node) {
    startLoop()
  } else {
    stopLoop()
    // Draw idle state
    draw()
  }
})

onMounted(() => {
  if (props.analyserNode) startLoop()
  else draw()
})

onUnmounted(stopLoop)
</script>

<template>
  <div class="spectrum-wrap">
    <div class="spectrum-label">SPECTRUM</div>
    <canvas
      ref="canvas"
      :width="width"
      :height="height"
      class="spectrum-canvas"
    />
    <div class="spectrum-axis">
      <span>20 Hz</span>
      <span>100</span>
      <span>1 kHz</span>
      <span>10 kHz</span>
      <span>20 kHz</span>
    </div>
  </div>
</template>

<style scoped>
.spectrum-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.spectrum-label {
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--text-dim);
  text-transform: uppercase;
  align-self: flex-start;
}

.spectrum-canvas {
  display: block;
  border-radius: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
}

.spectrum-axis {
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-size: 9px;
  color: var(--text-dim);
  letter-spacing: 0.05em;
  padding: 0 2px;
}
</style>
