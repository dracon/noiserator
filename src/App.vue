<script setup lang="ts">
import { ref, provide } from 'vue'
import OscillatorView from './views/OscillatorView.vue'
import NotchView from './views/NotchView.vue'
import NoiseView from './views/NoiseView.vue'
import MixerView from './views/MixerView.vue'
import { useAudioEngine } from './composables/useAudioEngine'
import { useNoiseEngine }  from './composables/useNoiseEngine'
import { useNotchFilter }  from './composables/useNotchFilter'
import { useSessionTimer } from './composables/useSessionTimer'
import { AudioEngineKey, NoiseEngineKey, NotchFilterKey, SessionTimerKey } from './injectionKeys'

type Tab = 'oscillator' | 'notch' | 'noise' | 'mixer'
const activeTab = ref<Tab>('oscillator')

const audioEngine = useAudioEngine()
const noiseEngine = useNoiseEngine()
const notchFilter = useNotchFilter()
const sessionTimer = useSessionTimer(audioEngine, noiseEngine, notchFilter)

provide(AudioEngineKey, audioEngine)
provide(NoiseEngineKey, noiseEngine)
provide(NotchFilterKey, notchFilter)
provide(SessionTimerKey, sessionTimer)
</script>

<template>
  <div class="app">
    <header class="title-bar">
      <div class="logo"><span class="logo-n">N</span>OISERATOR</div>
      <div v-if="sessionTimer.status.value !== 'idle'" class="timer-indicator">
        <span class="timer-dot" :class="sessionTimer.status.value" />
        {{ sessionTimer.remainingFormatted.value }}
      </div>

      <nav class="tabs">
        <button
          class="tab"
          :class="{ active: activeTab === 'oscillator' }"
          @click="activeTab = 'oscillator'"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 6 Q2.25 1 3.5 6 Q4.75 11 6 6 Q7.25 1 8.5 6 Q9.75 11 11 6"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          </svg>
          OSCILLATOR
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'notch' }"
          @click="activeTab = 'notch'"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 6 L4 6 Q5 6 5.5 2 Q6 6 6.5 10 Q7 6 8 6 L11 6"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          </svg>
          NOTCH FILTER
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'noise' }"
          @click="activeTab = 'noise'"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 6 L2.5 3 L4 8 L5.5 2 L7 10 L8.5 4 L10 7 L11 5"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
          NOISE
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'mixer' }"
          @click="activeTab = 'mixer'"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <line x1="2" y1="3" x2="2" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="6" y1="2" x2="6" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="10" y1="4" x2="10" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="2" cy="5.5" r="1.5" fill="currentColor"/>
            <circle cx="6" cy="4.5" r="1.5" fill="currentColor"/>
            <circle cx="10" cy="6.5" r="1.5" fill="currentColor"/>
          </svg>
          MIX
        </button>
      </nav>
    </header>

    <main class="view-host">
      <OscillatorView v-if="activeTab === 'oscillator'" />
      <NotchView      v-if="activeTab === 'notch'" />
      <NoiseView      v-if="activeTab === 'noise'" />
      <MixerView      v-if="activeTab === 'mixer'" />
    </main>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  padding: 28px 24px 32px;
  min-height: 100vh;
  overflow-y: auto;
}

/* Header */
.title-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.logo {
  font-size: 26px;
  letter-spacing: 0.3em;
  font-weight: 700;
  color: var(--text);
}

.logo-n {
  color: var(--accent-glow);
  text-shadow: 0 0 12px var(--accent-glow);
}

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 4px;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: var(--text-dim);
  font-family: inherit;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  transition: all 0.2s;
}

.tab:hover {
  color: var(--text);
}

.tab.active {
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--border);
  box-shadow: 0 1px 6px rgba(0,0,0,0.4);
}

.tab.active:first-child {
  color: var(--accent-glow);
}

.tab.active:nth-child(2) {
  color: #e066ff;
}

.tab.active:nth-child(3) {
  color: #4ecdc4;
}

.tab.active:nth-child(4) {
  color: #f0a500;
}

/* Timer indicator */
.timer-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  letter-spacing: 0.1em;
  color: #f0a500;
}

.timer-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f0a500;
  box-shadow: 0 0 6px #f0a500;
  flex-shrink: 0;
}

.timer-dot.fading {
  animation: timer-fade-pulse 0.6s ease-in-out infinite alternate;
}

@keyframes timer-fade-pulse {
  0%   { opacity: 1; }
  100% { opacity: 0.3; }
}

.view-host {
  width: 100%;
  display: flex;
  justify-content: center;
}
</style>
