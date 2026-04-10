<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import ChannelPanel from '../components/ChannelPanel.vue'
import Knob from '../components/Knob.vue'
import SpectrumAnalyzer from '../components/SpectrumAnalyzer.vue'
import { AudioEngineKey } from '../injectionKeys'

const { left, right, binaural, isRunning, toggle, WAVES, BINAURAL_PRESETS, analyserNode } = inject(AudioEngineKey)!

function selectPreset(key: string) {
  const preset = BINAURAL_PRESETS[key]
  binaural.value.preset = key
  binaural.value.beatFrequency = preset.default
}

// Keyboard navigation
// Knob order: L-freq(0), L-vol(1), L-wave(2), R-freq(3), R-vol(4), R-wave(5)
const focusedKnob = ref(-1)
const KNOB_COUNT = 6

const leftFocused = computed(() => ({
  freq: focusedKnob.value === 0,
  vol: focusedKnob.value === 1,
  wave: focusedKnob.value === 2,
}))

const rightFocused = computed(() => ({
  freq: focusedKnob.value === 3,
  vol: focusedKnob.value === 4,
  wave: focusedKnob.value === 5,
}))

function adjustKnob(index: number, dir: number) {
  const step = dir // +1 or -1
  switch (index) {
    case 0: { // left freq
      const range = 20000 - 20
      left.value.frequency = Math.min(20000, Math.max(20, left.value.frequency + (range / 100) * step))
      break
    }
    case 1: // left vol
      left.value.volume = Math.min(1, Math.max(0, left.value.volume + 0.01 * step))
      break
    case 2: { // left wave
      const idx = WAVES.indexOf(left.value.wave)
      const next = (idx + step + WAVES.length) % WAVES.length
      left.value.wave = WAVES[next]
      break
    }
    case 3: { // right freq
      const range = 20000 - 20
      right.value.frequency = Math.min(20000, Math.max(20, right.value.frequency + (range / 100) * step))
      break
    }
    case 4: // right vol
      right.value.volume = Math.min(1, Math.max(0, right.value.volume + 0.01 * step))
      break
    case 5: { // right wave
      const idx = WAVES.indexOf(right.value.wave)
      const next = (idx + step + WAVES.length) % WAVES.length
      right.value.wave = WAVES[next]
      break
    }
  }
}

function onKeydown(e: KeyboardEvent) {
  // Don't capture when editing an input
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
    <div class="mode-row">
      <div class="tagline">dual oscillator · stereo</div>
      <button
        class="binaural-toggle"
        :class="{ on: binaural.enabled }"
        @click="binaural.enabled = !binaural.enabled"
      >
        <span class="binaural-led" />
        BINAURAL
      </button>
    </div>

    <div v-if="binaural.enabled" class="binaural-panel">
      <div class="binaural-hint">use headphones for binaural effect</div>
      <div class="preset-row">
        <button
          v-for="(preset, key) in BINAURAL_PRESETS"
          :key="key"
          class="preset-btn"
          :class="{ active: binaural.preset === key }"
          @click="selectPreset(key as string)"
        >
          {{ preset.label }}
        </button>
      </div>
      <div class="binaural-knobs">
        <Knob
          :model-value="binaural.baseFrequency"
          :min="20" :max="1500"
          label="BASE"
          unit="Hz"
          :decimals="1"
          color="#7c5cbf"
          :size="84"
          @update:model-value="binaural.baseFrequency = $event"
        />
        <Knob
          :model-value="binaural.beatFrequency"
          :min="0.5" :max="40"
          label="BEAT"
          unit="Hz"
          :decimals="1"
          color="#00b8d9"
          :size="84"
          @update:model-value="binaural.beatFrequency = $event"
        />
      </div>
      <div class="binaural-readout">
        L: {{ binaural.baseFrequency.toFixed(1) }} Hz
        &nbsp;·&nbsp;
        R: {{ (binaural.baseFrequency + binaural.beatFrequency).toFixed(1) }} Hz
        &nbsp;·&nbsp;
        {{ binaural.beatFrequency.toFixed(1) }} Hz beat
      </div>
    </div>

    <main class="main-panel">
      <ChannelPanel
        :channel="left"
        label="LEFT ◂"
        color="#7c5cbf"
        :is-running="isRunning"
        :waves="WAVES"
        :freq-readonly="binaural.enabled"
        :focused-knobs="leftFocused"
        @update:frequency="left.frequency = $event"
        @update:volume="left.volume = $event"
        @update:wave="left.wave = $event"
        @toggle:enabled="left.enabled = !left.enabled"
        @toggle:inverted="left.inverted = !left.inverted"
      />

      <div class="center">
        <div class="center-inner">
          <button class="power-btn" :class="{ running: isRunning }" @click="toggle">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 5V14M8.5 7.8A9 9 0 1 0 19.5 7.8"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
            </svg>
          </button>
          <div class="power-label">{{ isRunning ? 'RUNNING' : 'START' }}</div>
          <div class="vu-wrap">
            <div class="vu-bar left-vu" :class="{ active: isRunning && left.enabled }" />
            <div class="vu-spacer" />
            <div class="vu-bar right-vu" :class="{ active: isRunning && right.enabled }" />
          </div>
        </div>
      </div>

      <ChannelPanel
        :channel="right"
        label="▸ RIGHT"
        color="#00b8d9"
        :is-running="isRunning"
        :waves="WAVES"
        :freq-readonly="binaural.enabled"
        :focused-knobs="rightFocused"
        @update:frequency="right.frequency = $event"
        @update:volume="right.volume = $event"
        @update:wave="right.wave = $event"
        @toggle:enabled="right.enabled = !right.enabled"
        @toggle:inverted="right.inverted = !right.inverted"
      />
    </main>

    <SpectrumAnalyzer :analyser-node="analyserNode" color="#7c5cbf" />

    <footer class="footer">
      space = power &nbsp;·&nbsp; ←/→ select knob &nbsp;·&nbsp; ↑/↓ adjust &nbsp;·&nbsp; drag or scroll &nbsp;·&nbsp; click value to edit
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
  gap: 20px;
}

.center {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120px;
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
  border-color: var(--accent);
  color: var(--accent-glow);
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
}

.power-btn.running::before {
  border-color: var(--accent-dim);
  box-shadow: 0 0 20px var(--accent-dim);
}

.power-btn:hover { filter: brightness(1.2); }

.power-label {
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--text-dim);
  text-transform: uppercase;
}

.vu-wrap {
  display: flex;
  gap: 4px;
  align-items: flex-end;
  height: 40px;
}

.vu-spacer { width: 4px; }

.vu-bar {
  width: 6px;
  height: 40px;
  border-radius: 3px;
  background: var(--border);
  position: relative;
  overflow: hidden;
}

.vu-bar::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 0%;
  border-radius: 3px;
  transition: height 0.1s;
}

.left-vu::after  { background: linear-gradient(to top, var(--accent), var(--accent-glow)); }
.right-vu::after { background: linear-gradient(to top, #00b8d9, #00e5ff); }

.vu-bar.active::after { animation: vu-pulse 0.8s ease-in-out infinite alternate; }
.left-vu.active::after  { box-shadow: 0 0 8px var(--accent-glow); }
.right-vu.active::after { box-shadow: 0 0 8px #00e5ff; }

@keyframes vu-pulse {
  0%   { height: 30%; }
  100% { height: 85%; }
}

/* Binaural mode */
.mode-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.binaural-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-dim);
  font-family: inherit;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  transition: all 0.2s;
}

.binaural-toggle.on {
  border-color: var(--accent);
  color: var(--accent-glow);
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
}

.binaural-led {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-dim);
  transition: all 0.2s;
}

.binaural-toggle.on .binaural-led {
  background: var(--accent-glow);
  box-shadow: 0 0 6px var(--accent-glow);
}

.binaural-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px 24px 18px;
}

.binaural-hint {
  font-size: 9px;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  text-transform: uppercase;
}

.preset-row {
  display: flex;
  gap: 6px;
}

.preset-btn {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-dim);
  font-family: inherit;
  font-size: 9px;
  letter-spacing: 0.12em;
  transition: all 0.2s;
}

.preset-btn:hover {
  color: var(--text);
}

.preset-btn.active {
  border-color: var(--accent);
  color: var(--accent-glow);
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
}

.binaural-knobs {
  display: flex;
  gap: 24px;
}

.binaural-readout {
  font-size: 10px;
  color: var(--text-dim);
  letter-spacing: 0.06em;
}

.footer {
  font-size: 10px;
  color: var(--text-dim);
  letter-spacing: 0.08em;
}
</style>
