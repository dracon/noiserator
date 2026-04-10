# CLAUDE.md

## Project overview

Noiserator is a Vue 3 + TypeScript single-page audio tool. It has three pages:
- **Oscillator** — dual-channel stereo oscillator with independent frequency, volume, waveform, and phase controls per channel. Includes a binaural beats mode.
- **Notch Filter** — microphone or app audio → notch filter chain → headphone output for tinnitus relief.
- **Noise** — white/pink/brown noise generator with stereo width control, powered by an `AudioWorklet`.

No routing library. Tab state is a single `ref<'oscillator' | 'notch' | 'noise'>` in `App.vue`.

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
  - Binaural mode: locks L/R frequencies to `baseFrequency` and `baseFrequency + beatFrequency`
  - LocalStorage key: `noiserator-settings`

- `src/composables/useNotchFilter.ts` — notch filter engine
  - `getUserMedia` or `getDisplayMedia` → `MediaStreamAudioSourceNode` → chain of `BiquadFilterNode(type: 'notch')` → `destination`
  - Chain is rebuilt (`reconnect()`) when bands are added, removed, or toggled
  - Live parameter changes (freq, Q) use `setTargetAtTime` on existing nodes — no rebuild needed
  - LocalStorage key: `noiserator-notch`

- `src/composables/useNoiseEngine.ts` — noise generator engine
  - `AudioWorkletNode` (`/noise-processor.js`) → `GainNode` → `destination`
  - Noise type switched via `workletNode.port.postMessage`; stereo width via `AudioParam`
  - LocalStorage key: `noiserator-noise`

Each composable exposes `analyserNode: Ref<AnalyserNode | null>` — created on start as a branch tap from the output node, nulled on stop.

### Components

- `Knob.vue` — SVG rotary knob. Drag up/down to change value, scroll wheel for fine control, click value to inline-edit. Props: `modelValue`, `min`, `max`, `label`, `unit`, `decimals`, `size`, `color`.
- `WaveKnob.vue` — Same visual as Knob but snaps to 4 wave positions. Click to cycle, drag to scrub.
- `NoiseTypeKnob.vue` — Same visual as WaveKnob but for white/pink/brown noise selection.
- `ChannelPanel.vue` — Composes Knob + WaveKnob + LED toggles for one oscillator channel.
- `FrequencyChart.vue` — Pure SVG frequency response curve. Computes biquad notch magnitude response mathematically (no audio nodes). Log-scale X axis (20 Hz–20 kHz), dB Y axis.
- `SpectrumAnalyzer.vue` — Canvas-based real-time FFT display. Takes `analyserNode: AnalyserNode | null` prop; runs a `requestAnimationFrame` loop drawing a log-scale filled spectrum. Props: `analyserNode`, `color`, `width`, `height`.

### Styling

Global CSS variables are defined in `src/style.css`. All components use scoped styles. No CSS framework. Colors:
- Left oscillator channel: `#7c5cbf` (purple)
- Right oscillator channel: `#00b8d9` (cyan)
- Notch filter: `#e066ff` (magenta)
- Noise generator: `#4ecdc4` (teal)

## Conventions

- All audio parameter changes use `setTargetAtTime` with a short time constant (0.005–0.01 s) to avoid click artefacts.
- State that drives audio is stored in `ref<ChannelState>` and synced to audio nodes via `watch`.
- `localStorage` persistence is handled inside each composable — components and views are unaware of it.
- No external audio or UI libraries — Web Audio API only.
