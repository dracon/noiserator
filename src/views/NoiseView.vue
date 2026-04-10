<script setup lang="ts">
import { ref, inject, onMounted, onUnmounted } from 'vue'
import type { NoiseType } from '../composables/useNoiseEngine'
import Knob from '../components/Knob.vue'
import NoiseTypeKnob from '../components/NoiseTypeKnob.vue'
import SpectrumAnalyzer from '../components/SpectrumAnalyzer.vue'
import { NoiseEngineKey } from '../injectionKeys'

const { state, isRunning, toggle, NOISE_TYPES, analyserNode } = inject(NoiseEngineKey)!

// Keyboard navigation: noise-type(0), vol(1), width(2)
const focusedKnob = ref(-1)
const KNOB_COUNT = 3

function adjustKnob(index: number, dir: number) {
  switch (index) {
    case 0: { // noise type
      const idx = NOISE_TYPES.indexOf(state.value.noiseType)
      const next = (idx + dir + NOISE_TYPES.length) % NOISE_TYPES.length
      state.value.noiseType = NOISE_TYPES[next] as NoiseType
      break
    }
    case 1: // volume
      state.value.volume = Math.min(1, Math.max(0, state.value.volume + 0.01 * dir))
      break
    case 2: // width
      state.value.stereoWidth = Math.min(1, Math.max(0, state.value.stereoWidth + 0.01 * dir))
      break
  }
}

function onKeydown(e: KeyboardEvent) {
  if (document.activeElement instanceof HTMLInputElement) return

  switch (e.key) {
    case ' ':
      toggle()
      e.preventDefault()
      break
    case 'ArrowRight':
      focusedKnob.value = focusedKnob.value < 0 ? 0 : (focusedKnob.value + 1) % KNOB_COUNT
      e.preventDefault()
      break
    case 'ArrowLeft':
      focusedKnob.value = focusedKnob.value <= 0 ? KNOB_COUNT - 1 : focusedKnob.value - 1
      e.preventDefault()
      break
    case 'ArrowUp':
      if (focusedKnob.value >= 0) adjustKnob(focusedKnob.value, 1)
      e.preventDefault()
      break
    case 'ArrowDown':
      if (focusedKnob.value >= 0) adjustKnob(focusedKnob.value, -1)
      e.preventDefault()
      break
    case 'Escape':
      focusedKnob.value = -1
      break
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="view">
    <div class="tagline">noise generator · stereo</div>

    <main class="main-panel">
      <div class="noise-panel">
        <div class="panel-header">NOISE GENERATOR</div>
        <div class="knobs">
          <NoiseTypeKnob
            :model-value="state.noiseType"
            :noise-types="NOISE_TYPES"
            color="#4ecdc4"
            :size="84"
            :focused="focusedKnob === 0"
            @update:model-value="state.noiseType = $event"
          />
          <Knob
            :model-value="state.volume"
            :min="0" :max="1"
            label="VOL"
            :decimals="2"
            color="#4ecdc4"
            :size="84"
            :focused="focusedKnob === 1"
            @update:model-value="state.volume = $event"
          />
          <Knob
            :model-value="state.stereoWidth"
            :min="0" :max="1"
            label="WIDTH"
            :decimals="2"
            color="#4ecdc4"
            :size="84"
            :focused="focusedKnob === 2"
            @update:model-value="state.stereoWidth = $event"
          />
        </div>
      </div>

      <div class="center">
        <div class="center-inner">
          <button class="power-btn" :class="{ running: isRunning }" @click="toggle">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 5V14M8.5 7.8A9 9 0 1 0 19.5 7.8"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
            </svg>
          </button>
          <div class="power-label">{{ isRunning ? 'RUNNING' : 'START' }}</div>
        </div>
      </div>
    </main>

    <SpectrumAnalyzer :analyser-node="analyserNode" color="#4ecdc4" />

    <footer class="footer">
      space = power &nbsp;·&nbsp; ←/→ select knob &nbsp;·&nbsp; ↑/↓ adjust &nbsp;·&nbsp; drag or scroll &nbsp;·&nbsp; click noise type to cycle
    </footer>
  </div>
</template>

<style scoped>
.view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.tagline {
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--text-dim);
  text-transform: uppercase;
}

.main-panel {
  display: flex;
  align-items: center;
  gap: 28px;
}

.noise-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px 28px 24px;
}

.panel-header {
  font-size: 10px;
  letter-spacing: 0.18em;
  color: #4ecdc4;
  text-transform: uppercase;
}

.knobs {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.center {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100px;
}

.center-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.power-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: var(--surface);
  color: var(--text-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s;
  position: relative;
}

.power-btn::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1px solid transparent;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.power-btn.running {
  border-color: #4ecdc4;
  color: #4ecdc4;
  background: color-mix(in srgb, #4ecdc4 12%, var(--surface));
}

.power-btn.running::before {
  border-color: rgba(78, 205, 196, 0.3);
  box-shadow: 0 0 20px rgba(78, 205, 196, 0.3);
}

.power-btn:hover { filter: brightness(1.2); }

.power-label {
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--text-dim);
  text-transform: uppercase;
}

.footer {
  font-size: 10px;
  color: var(--text-dim);
  letter-spacing: 0.08em;
}
</style>
