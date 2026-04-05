<script setup lang="ts">
import Knob from './Knob.vue'
import WaveKnob from './WaveKnob.vue'
import type { ChannelState, WaveType } from '../composables/useAudioEngine'

const props = defineProps<{
  channel: ChannelState
  label: string
  color: string
  isRunning: boolean
  waves: WaveType[]
  freqReadonly?: boolean
  focusedKnobs?: { freq: boolean; vol: boolean; wave: boolean }
}>()

const emit = defineEmits<{
  'update:frequency': [v: number]
  'update:volume': [v: number]
  'update:wave': [v: WaveType]
  'toggle:enabled': []
  'toggle:inverted': []
}>()
</script>

<template>
  <div class="channel-panel" :class="{ active: channel.enabled && isRunning }">
    <!-- Header -->
    <div class="ch-header">
      <span class="ch-label">{{ label }}</span>
      <div class="ch-header-controls">
        <!-- Phase invert button -->
        <button
          class="phase-btn"
          :class="{ on: channel.inverted }"
          :style="channel.inverted ? `--c: ${color}` : ''"
          :title="channel.inverted ? 'Phase: 180°' : 'Phase: 0°'"
          @click="emit('toggle:inverted')"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <!-- sine wave left half normal, right half flipped -->
            <path
              d="M1 8 Q2.5 3 4 8 Q5.5 13 7 8"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"
            />
            <path
              d="M9 8 Q10.5 13 12 8 Q13.5 3 15 8"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"
            />
            <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" stroke-width="0.75" stroke-dasharray="2 1.5" opacity="0.4"/>
          </svg>
          <span class="phase-deg">{{ channel.inverted ? '180°' : '0°' }}</span>
        </button>

        <!-- Enable toggle -->
        <button
          class="ch-toggle"
          :class="{ on: channel.enabled }"
          :style="channel.enabled ? `--c: ${color}` : ''"
          @click="emit('toggle:enabled')"
        >
          <span class="led" />
        </button>
      </div>
    </div>

    <!-- Knobs -->
    <div class="knobs">
      <div :class="{ 'freq-readonly': freqReadonly }">
        <Knob
          :model-value="channel.frequency"
          :min="20"
          :max="20000"
          label="FREQ"
          unit="Hz"
          :decimals="0"
          :color="color"
          :size="84"
          :focused="focusedKnobs?.freq"
          @update:model-value="emit('update:frequency', $event)"
        />
      </div>
      <Knob
        :model-value="channel.volume"
        :min="0"
        :max="1"
        label="VOL"
        :decimals="2"
        :color="color"
        :size="84"
        :focused="focusedKnobs?.vol"
        @update:model-value="emit('update:volume', $event)"
      />
      <WaveKnob
        :model-value="channel.wave"
        :waves="waves"
        :color="color"
        :size="84"
        :focused="focusedKnobs?.wave"
        @update:model-value="emit('update:wave', $event)"
      />
    </div>

    <!-- Decorative freq bar -->
    <div class="freq-bar">
      <div
        class="freq-fill"
        :style="{
          width: `${((channel.frequency - 20) / 19980) * 100}%`,
          background: color,
          boxShadow: `0 0 6px ${color}`,
        }"
      />
    </div>
  </div>
</template>

<style scoped>
.channel-panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px 28px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 300px;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.channel-panel.active {
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 24px rgba(0,0,0,0.5);
}

.ch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ch-label {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.ch-header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Phase invert button */
.phase-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-dim);
  font-size: 9px;
  letter-spacing: 0.08em;
  transition: all 0.2s;
}

.phase-btn.on {
  border-color: var(--c);
  background: color-mix(in srgb, var(--c) 15%, var(--surface));
  color: var(--c);
  box-shadow: 0 0 8px color-mix(in srgb, var(--c) 30%, transparent);
}

.phase-deg {
  font-size: 9px;
  min-width: 22px;
}

/* Enable toggle */
.ch-toggle {
  width: 32px;
  height: 18px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  align-items: center;
  padding: 2px;
  transition: background 0.2s, border-color 0.2s;
}

.ch-toggle.on {
  background: color-mix(in srgb, var(--c) 20%, var(--surface));
  border-color: var(--c);
}

.ch-toggle .led {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--text-dim);
  margin-left: auto;
  transition: background 0.2s, box-shadow 0.2s, margin 0.2s;
}

.ch-toggle.on .led {
  background: var(--c, var(--led-on));
  box-shadow: 0 0 6px var(--c, var(--led-on));
  margin-left: auto;
}

.ch-toggle:not(.on) .led {
  margin-left: 0;
}

.knobs {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: flex-start;
}

.freq-bar {
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}

.freq-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.05s linear;
}

.freq-readonly {
  pointer-events: none;
  opacity: 0.45;
}
</style>
