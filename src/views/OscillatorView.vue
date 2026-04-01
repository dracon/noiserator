<script setup lang="ts">
import { useAudioEngine } from '../composables/useAudioEngine'
import ChannelPanel from '../components/ChannelPanel.vue'

const { left, right, isRunning, toggle, WAVES } = useAudioEngine()
</script>

<template>
  <div class="view">
    <div class="tagline">dual oscillator · stereo</div>

    <main class="main-panel">
      <ChannelPanel
        :channel="left"
        label="LEFT ◂"
        color="#7c5cbf"
        :is-running="isRunning"
        :waves="WAVES"
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
        @update:frequency="right.frequency = $event"
        @update:volume="right.volume = $event"
        @update:wave="right.wave = $event"
        @toggle:enabled="right.enabled = !right.enabled"
        @toggle:inverted="right.inverted = !right.inverted"
      />
    </main>

    <footer class="footer">
      drag knobs up/down &nbsp;·&nbsp; scroll to fine-tune &nbsp;·&nbsp; click wave to cycle
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

.footer {
  font-size: 10px;
  color: var(--text-dim);
  letter-spacing: 0.08em;
}
</style>
