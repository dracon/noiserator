# CLAUDE.md

## Project overview

Noiserator is a Vue 3 + TypeScript single-page audio tool. It has two pages:
- **Oscillator** — dual-channel stereo oscillator with independent frequency, volume, waveform, and phase controls per channel.
- **Notch Filter** — microphone → notch filter chain → headphone output for tinnitus relief.

No routing library. Tab state is a single `ref<'oscillator' | 'notch'>` in `App.vue`.

## Commands

```bash
npm run dev      # start dev server at http://localhost:5173
npm run build    # type-check + vite build → dist/
npm run preview  # serve dist/ locally
```

## Architecture

### Audio engines

Each page has its own composable that owns an `AudioContext`:

- `src/composables/useAudioEngine.ts` — oscillator engine
  - Two `OscillatorNode`s routed through a `ChannelMergerNode` for true stereo
  - Phase inversion: `GainNode` with value `1` or `−1` between oscillator and volume gain
  - LocalStorage key: `noiserator-settings`

- `src/composables/useNotchFilter.ts` — notch filter engine
  - `getUserMedia` → `MediaStreamAudioSourceNode` → chain of `BiquadFilterNode(type: 'notch')` → `destination`
  - Chain is rebuilt (`reconnect()`) when bands are added, removed, or toggled
  - Live parameter changes (freq, Q) use `setTargetAtTime` on existing nodes — no rebuild needed
  - LocalStorage key: `noiserator-notch`

### Components

- `Knob.vue` — SVG rotary knob. Drag up/down to change value, scroll wheel for fine control. Props: `modelValue`, `min`, `max`, `label`, `unit`, `decimals`, `size`, `color`.
- `WaveKnob.vue` — Same visual as Knob but snaps to 4 wave positions. Click to cycle, drag to scrub.
- `ChannelPanel.vue` — Composes Knob + WaveKnob + LED toggles for one oscillator channel.
- `FrequencyChart.vue` — Pure SVG frequency response curve. Computes biquad notch magnitude response mathematically (no audio nodes). Log-scale X axis (20 Hz–20 kHz), dB Y axis.

### Styling

Global CSS variables are defined in `src/style.css`. All components use scoped styles. No CSS framework. Colors:
- Left oscillator channel: `#7c5cbf` (purple)
- Right oscillator channel: `#00b8d9` (cyan)
- Notch filter: `#e066ff` (magenta)

## Conventions

- All audio parameter changes use `setTargetAtTime` with a short time constant (0.005–0.01 s) to avoid click artefacts.
- State that drives audio is stored in `ref<ChannelState>` and synced to audio nodes via `watch`.
- `localStorage` persistence is handled inside each composable — components and views are unaware of it.
- No external audio or UI libraries — Web Audio API only.
