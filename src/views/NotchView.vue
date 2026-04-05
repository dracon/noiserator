<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useNotchFilter } from '../composables/useNotchFilter'
import type { AudioSource } from '../composables/useNotchFilter'
import Knob from '../components/Knob.vue'
import FrequencyChart from '../components/FrequencyChart.vue'

const { bands, isRunning, error, sourceMode, toggle, setSource, addBand, removeBand } = useNotchFilter()

// Keyboard navigation
// Knob order: band0-freq, band0-q, band1-freq, band1-q, ...
const focusedKnob = ref(-1)

const knobCount = computed(() => bands.value.length * 2)

function knobFocused(bandIndex: number, knobType: 'freq' | 'q') {
  const base = bandIndex * 2
  return focusedKnob.value === base + (knobType === 'freq' ? 0 : 1)
}

function adjustKnob(index: number, dir: number) {
  const bandIdx = Math.floor(index / 2)
  const isQ = index % 2 === 1
  const band = bands.value[bandIdx]
  if (!band) return

  if (isQ) {
    const range = 200 - 1
    band.q = Math.min(200, Math.max(1, band.q + (range / 100) * dir))
  } else {
    const range = 20000 - 20
    band.frequency = Math.min(20000, Math.max(20, band.frequency + (range / 100) * dir))
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
      focusedKnob.value = focusedKnob.value < 0 ? 0 : (focusedKnob.value + 1) % knobCount.value
      e.preventDefault()
      break
    case 'ArrowLeft':
      focusedKnob.value = focusedKnob.value <= 0 ? knobCount.value - 1 : focusedKnob.value - 1
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

const sources: { value: AudioSource; label: string; icon: string; hint: string }[] = [
  {
    value: 'mic',
    label: 'MICROPHONE',
    icon: 'M14 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM8 11a6 6 0 0 0 12 0M14 19v3',
    hint: 'Capture from your microphone',
  },
  {
    value: 'app',
    label: 'APP AUDIO',
    icon: 'M4 4h16v10H4zM9 18h6M12 14v4',
    hint: 'Capture Spotify or any app — select the window and tick "Share audio"',
  },
]
</script>

<template>
  <div class="view">
    <div class="tagline">tinnitus notch filter · {{ sourceMode === 'mic' ? 'mic' : 'app audio' }} → headphone</div>

    <!-- Frequency response chart -->
    <FrequencyChart :bands="bands" :width="680" :height="140" />

    <!-- Source selector -->
    <div class="source-row">
      <button
        v-for="s in sources"
        :key="s.value"
        class="source-btn"
        :class="{ active: sourceMode === s.value }"
        :disabled="isRunning"
        :title="s.hint"
        @click="setSource(s.value)"
      >
        <svg width="14" height="14" viewBox="0 0 28 28" fill="none">
          <path :d="s.icon" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {{ s.label }}
      </button>

      <div class="source-hint">{{ sources.find(s => s.value === sourceMode)?.hint }}</div>
    </div>

    <!-- App audio notice -->
    <div v-if="sourceMode === 'app'" class="info-box">
      <strong>How it works:</strong> clicking START opens your browser's screen/window picker.
      Select the window or tab playing audio and check <em>"Share audio"</em>. The filtered audio is sent to your headphones.
      <br /><br />
      <strong>Spotify Web Player (browser tab):</strong> Chrome will automatically silence the original tab so you only hear the filtered output. No extra steps needed.
      <br /><br />
      <strong>Spotify desktop app:</strong> Chrome cannot silence a native app. While the filter is active, mute Spotify's output in your system volume mixer (e.g. right-click the speaker icon → App Volume → mute Spotify) so only the filtered stream plays.
      <br /><br />
      <strong>Note:</strong> Firefox does not support system audio capture — use Chrome or Chromium.
    </div>

    <!-- Controls row -->
    <div class="controls-row">
      <button class="power-btn" :class="{ running: isRunning }" @click="toggle">
        <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
          <path d="M14 5V14M8.5 7.8A9 9 0 1 0 19.5 7.8"
            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        </svg>
        <span>{{ isRunning ? 'ACTIVE · CLICK TO STOP' : `START ${sourceMode === 'mic' ? 'MIC' : 'APP AUDIO'}` }}</span>
      </button>

      <div v-if="error" class="error-msg">⚠ {{ error }}</div>

      <div class="spacer" />

      <button class="add-btn" :disabled="bands.length >= 6" @click="addBand">
        + ADD BAND
      </button>
    </div>

    <!-- Notch bands -->
    <div class="bands">
      <div
        v-for="band in bands"
        :key="band.id"
        class="band-card"
        :class="{ disabled: !band.enabled }"
      >
        <div class="band-header">
          <span class="band-label">NOTCH {{ band.id }}</span>
          <div class="band-header-controls">
            <button
              class="band-toggle"
              :class="{ on: band.enabled }"
              @click="band.enabled = !band.enabled"
            >
              <span class="led" />
            </button>
            <button class="remove-btn" :disabled="bands.length <= 1" @click="removeBand(band.id)">✕</button>
          </div>
        </div>

        <div class="band-knobs">
          <Knob
            :model-value="band.frequency"
            :min="20"
            :max="20000"
            label="FREQ"
            unit="Hz"
            :decimals="0"
            color="#e066ff"
            :size="84"
            :focused="knobFocused(bands.indexOf(band), 'freq')"
            @update:model-value="band.frequency = $event"
          />
          <Knob
            :model-value="band.q"
            :min="1"
            :max="200"
            label="Q"
            :decimals="1"
            color="#e066ff"
            :size="84"
            :focused="knobFocused(bands.indexOf(band), 'q')"
            @update:model-value="band.q = $event"
          />
        </div>

        <div class="band-readout">
          <span class="readout-freq">
            {{ band.frequency >= 1000
                ? `${(band.frequency / 1000).toFixed(2)} kHz`
                : `${Math.round(band.frequency)} Hz` }}
          </span>
          <span class="readout-bw">BW ≈ {{ (band.frequency / band.q).toFixed(0) }} Hz</span>
        </div>
      </div>
    </div>

    <footer class="footer">
      space = power &nbsp;·&nbsp; ←/→ select knob &nbsp;·&nbsp; ↑/↓ adjust &nbsp;·&nbsp; higher Q = narrower notch
    </footer>
  </div>
</template>

<style scoped>
.view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.tagline {
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--text-dim);
  text-transform: uppercase;
}

/* Source selector */
.source-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 680px;
}

.source-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-dim);
  font-family: inherit;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition: all 0.2s;
  white-space: nowrap;
}

.source-btn.active {
  border-color: #e066ff;
  color: #e066ff;
  background: color-mix(in srgb, #e066ff 10%, var(--surface));
}

.source-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.source-btn:not(:disabled):not(.active):hover {
  border-color: var(--text-dim);
  color: var(--text);
}

.source-hint {
  font-size: 9px;
  color: var(--text-dim);
  letter-spacing: 0.06em;
  flex: 1;
  text-align: right;
}

/* Info box */
.info-box {
  width: 680px;
  background: color-mix(in srgb, #e066ff 6%, var(--surface));
  border: 1px solid color-mix(in srgb, #e066ff 25%, transparent);
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 11px;
  color: var(--text-dim);
  line-height: 1.7;
}

.info-box strong { color: var(--text); }
.info-box em     { color: #e066ff; font-style: normal; }

/* Controls row */
.controls-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 680px;
}

.spacer { flex: 1; }

.power-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-dim);
  font-family: inherit;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition: all 0.25s;
}

.power-btn.running {
  border-color: #e066ff;
  color: #e066ff;
  background: color-mix(in srgb, #e066ff 10%, var(--surface));
  box-shadow: 0 0 16px color-mix(in srgb, #e066ff 25%, transparent);
}

.power-btn:hover { filter: brightness(1.2); }

.error-msg {
  font-size: 11px;
  color: #ff6b6b;
  letter-spacing: 0.05em;
}

.add-btn {
  padding: 7px 14px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-dim);
  font-family: inherit;
  font-size: 10px;
  letter-spacing: 0.12em;
  transition: all 0.2s;
}

.add-btn:hover:not(:disabled) { border-color: #e066ff; color: #e066ff; }
.add-btn:disabled { opacity: 0.35; cursor: not-allowed; }

/* Bands */
.bands {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 760px;
}

.band-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px 22px 14px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 220px;
  transition: border-color 0.3s, opacity 0.3s;
}

.band-card.disabled { opacity: 0.45; }

.band-card:not(.disabled) {
  border-color: rgba(224, 102, 255, 0.2);
  box-shadow: 0 0 18px rgba(224, 102, 255, 0.06);
}

.band-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.band-label {
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.band-header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.band-toggle {
  width: 30px;
  height: 17px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  align-items: center;
  padding: 2px;
  transition: all 0.2s;
}

.band-toggle.on {
  background: color-mix(in srgb, #e066ff 18%, var(--surface));
  border-color: #e066ff;
}

.band-toggle .led {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--text-dim);
  margin-left: 0;
  transition: all 0.2s;
}

.band-toggle.on .led {
  background: #e066ff;
  box-shadow: 0 0 6px #e066ff;
  margin-left: auto;
}

.remove-btn {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-dim);
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.remove-btn:hover:not(:disabled) { border-color: #ff6b6b; color: #ff6b6b; }
.remove-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.band-knobs {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.band-readout {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.readout-freq { font-size: 11px; color: #e066ff; letter-spacing: 0.06em; }
.readout-bw   { font-size: 9px;  color: var(--text-dim); letter-spacing: 0.05em; }

.footer {
  font-size: 10px;
  color: var(--text-dim);
  letter-spacing: 0.08em;
}
</style>
