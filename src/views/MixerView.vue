<script setup lang="ts">
import { inject, ref, computed } from 'vue'
import Knob from '../components/Knob.vue'
import { AudioEngineKey, NoiseEngineKey, NotchFilterKey, SessionTimerKey } from '../injectionKeys'

const audioEngine = inject(AudioEngineKey)!
const noiseEngine = inject(NoiseEngineKey)!
const notchFilter = inject(NotchFilterKey)!
const timer = inject(SessionTimerKey)!

const FADE_OPTIONS = [
  { label: '30 sec', value: 30 },
  { label: '1 min',  value: 60 },
  { label: '2 min',  value: 120 },
  { label: '5 min',  value: 300 },
]

const customMinutes = ref(Math.round(timer.duration.value / 60))

function applyCustomDuration() {
  const mins = Math.max(1, Math.min(480, customMinutes.value))
  customMinutes.value = mins
  timer.setDuration(mins * 60)
}

const activePreset = computed(() =>
  [15, 30, 45, 60].includes(timer.duration.value / 60) ? timer.duration.value / 60 : null
)
</script>

<template>
  <div class="view">
    <div class="tagline">mixer · session timer</div>

    <!-- Engine mixer -->
    <div class="engines-panel">
      <div class="panel-header">ENGINES</div>

      <!-- Oscillator -->
      <div class="engine-row">
        <div class="engine-info">
          <span class="led" :class="{ active: audioEngine.isRunning.value }" style="--led-color: #9b7de0" />
          <span class="engine-name">OSCILLATOR</span>
        </div>
        <button class="engine-btn" :class="{ running: audioEngine.isRunning.value }" @click="audioEngine.toggle()">
          {{ audioEngine.isRunning.value ? 'STOP' : 'START' }}
        </button>
        <div class="engine-knobs">
          <Knob
            :model-value="audioEngine.left.value.volume"
            :min="0" :max="1" label="L" :decimals="2"
            color="#7c5cbf" :size="56"
            @update:model-value="audioEngine.left.value.volume = $event"
          />
          <Knob
            :model-value="audioEngine.right.value.volume"
            :min="0" :max="1" label="R" :decimals="2"
            color="#00b8d9" :size="56"
            @update:model-value="audioEngine.right.value.volume = $event"
          />
        </div>
      </div>

      <div class="divider" />

      <!-- Noise -->
      <div class="engine-row">
        <div class="engine-info">
          <span class="led" :class="{ active: noiseEngine.isRunning.value }" style="--led-color: #4ecdc4" />
          <span class="engine-name">NOISE</span>
        </div>
        <button class="engine-btn" :class="{ running: noiseEngine.isRunning.value }" @click="noiseEngine.toggle()">
          {{ noiseEngine.isRunning.value ? 'STOP' : 'START' }}
        </button>
        <div class="engine-knobs">
          <Knob
            :model-value="noiseEngine.state.value.volume"
            :min="0" :max="1" label="VOL" :decimals="2"
            color="#4ecdc4" :size="56"
            @update:model-value="noiseEngine.state.value.volume = $event"
          />
        </div>
      </div>

      <div class="divider" />

      <!-- Notch Filter -->
      <div class="engine-row">
        <div class="engine-info">
          <span class="led" :class="{ active: notchFilter.isRunning.value }" style="--led-color: #e066ff" />
          <span class="engine-name">NOTCH FILTER</span>
        </div>
        <button class="engine-btn" :class="{ running: notchFilter.isRunning.value }" @click="notchFilter.toggle()">
          {{ notchFilter.isRunning.value ? 'STOP' : 'START' }}
        </button>
        <div class="engine-knobs notch-placeholder">
          <span v-if="notchFilter.error.value" class="engine-error">{{ notchFilter.error.value }}</span>
          <span v-else class="engine-hint">configure on NOTCH FILTER tab</span>
        </div>
      </div>
    </div>

    <!-- Session timer -->
    <div class="timer-panel">
      <div class="panel-header amber">SESSION TIMER</div>

      <div class="preset-row">
        <button
          v-for="m in [15, 30, 45, 60]"
          :key="m"
          class="preset-btn"
          :class="{ active: activePreset === m }"
          :disabled="timer.status.value !== 'idle'"
          @click="timer.setDuration(m * 60); customMinutes = m"
        >
          {{ m }} MIN
        </button>
      </div>

      <div class="custom-row">
        <label class="field-label">CUSTOM</label>
        <input
          v-model.number="customMinutes"
          type="number"
          min="1"
          max="480"
          class="custom-input"
          :disabled="timer.status.value !== 'idle'"
          @change="applyCustomDuration"
        />
        <span class="field-label">MIN</span>

        <label class="field-label" style="margin-left: 16px">FADE</label>
        <select
          class="fade-select"
          :value="timer.fadeDuration.value"
          :disabled="timer.status.value !== 'idle'"
          @change="timer.setFadeDuration(Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="opt in FADE_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <div class="timer-controls">
        <button
          class="timer-btn"
          :class="{ cancel: timer.status.value !== 'idle' }"
          @click="timer.status.value === 'idle' ? timer.start() : timer.cancel()"
        >
          {{ timer.status.value === 'idle' ? 'START TIMER' : 'CANCEL' }}
        </button>
      </div>

      <div v-if="timer.status.value !== 'idle'" class="countdown-wrap">
        <div class="countdown" :class="timer.status.value">
          {{ timer.remainingFormatted.value }}
        </div>
        <div class="status-label">
          {{ timer.status.value === 'fading' ? 'FADING OUT...' : 'RUNNING' }}
        </div>
      </div>
    </div>
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

/* Engine panel */
.engines-panel {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px 28px 24px;
  width: 560px;
}

.panel-header {
  font-size: 10px;
  letter-spacing: 0.18em;
  color: var(--text-dim);
  text-transform: uppercase;
  margin-bottom: 18px;
}

.panel-header.amber {
  color: #f0a500;
}

.engine-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 0;
}

.engine-info {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 140px;
  flex-shrink: 0;
}

.led {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-dim);
  flex-shrink: 0;
  transition: all 0.2s;
}

.led.active {
  background: var(--led-color);
  box-shadow: 0 0 6px var(--led-color);
}

.engine-name {
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--text-dim);
  text-transform: uppercase;
}

.engine-btn {
  padding: 5px 14px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-dim);
  font-family: inherit;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  transition: all 0.2s;
  width: 68px;
  flex-shrink: 0;
}

.engine-btn:hover { color: var(--text); }

.engine-btn.running {
  border-color: var(--accent);
  color: var(--accent-glow);
  background: color-mix(in srgb, var(--accent) 10%, var(--surface));
}

.engine-knobs {
  display: flex;
  gap: 12px;
  align-items: center;
  flex: 1;
}

.notch-placeholder {
  justify-content: flex-start;
}

.engine-hint {
  font-size: 9px;
  color: var(--text-dim);
  letter-spacing: 0.06em;
  opacity: 0.6;
}

.engine-error {
  font-size: 9px;
  color: #ff6b6b;
  letter-spacing: 0.06em;
}

.divider {
  height: 1px;
  background: var(--border);
  opacity: 0.5;
}

/* Timer panel */
.timer-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  background: var(--panel);
  border: 1px solid color-mix(in srgb, #f0a500 20%, var(--border));
  border-radius: 14px;
  padding: 20px 28px 24px;
  width: 560px;
}

.preset-row {
  display: flex;
  gap: 8px;
}

.preset-btn {
  padding: 6px 16px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-dim);
  font-family: inherit;
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition: all 0.2s;
}

.preset-btn:not(:disabled):hover { color: var(--text); }

.preset-btn.active {
  border-color: #f0a500;
  color: #f0a500;
  background: color-mix(in srgb, #f0a500 10%, var(--surface));
}

.preset-btn:disabled { opacity: 0.4; cursor: default; }

.custom-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-label {
  font-size: 9px;
  letter-spacing: 0.14em;
  color: var(--text-dim);
  text-transform: uppercase;
}

.custom-input {
  width: 60px;
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-family: inherit;
  font-size: 11px;
  text-align: center;
}

.custom-input:disabled { opacity: 0.4; }

.custom-input:focus {
  outline: none;
  border-color: #f0a500;
}

.fade-select {
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-family: inherit;
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.fade-select:disabled { opacity: 0.4; }

.fade-select:focus { outline: none; border-color: #f0a500; }

.timer-controls {
  display: flex;
  justify-content: center;
}

.timer-btn {
  padding: 8px 32px;
  border-radius: 8px;
  border: 1px solid #f0a500;
  background: color-mix(in srgb, #f0a500 12%, var(--surface));
  color: #f0a500;
  font-family: inherit;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  transition: all 0.2s;
}

.timer-btn:hover { filter: brightness(1.2); }

.timer-btn.cancel {
  border-color: var(--border);
  background: var(--surface);
  color: var(--text-dim);
}

.countdown-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.countdown {
  font-size: 40px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
  color: #f0a500;
  transition: color 0.3s;
}

.countdown.fading {
  animation: countdown-pulse 0.6s ease-in-out infinite alternate;
}

@keyframes countdown-pulse {
  0%   { opacity: 1; }
  100% { opacity: 0.4; }
}

.status-label {
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--text-dim);
  text-transform: uppercase;
}
</style>
