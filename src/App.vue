<script setup lang="ts">
import { ref } from 'vue'
import OscillatorView from './views/OscillatorView.vue'
import NotchView from './views/NotchView.vue'

type Tab = 'oscillator' | 'notch'
const activeTab = ref<Tab>('oscillator')
</script>

<template>
  <div class="app">
    <header class="title-bar">
      <div class="logo"><span class="logo-n">N</span>OISERATOR</div>
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
      </nav>
    </header>

    <main class="view-host">
      <OscillatorView v-if="activeTab === 'oscillator'" />
      <NotchView      v-if="activeTab === 'notch'" />
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

.tab.active:last-child {
  color: #e066ff;
}

.view-host {
  width: 100%;
  display: flex;
  justify-content: center;
}
</style>
