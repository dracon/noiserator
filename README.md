# Noiserator

A browser-based audio tool built with Vue 3 + TypeScript and the Web Audio API. Three pages: a dual-channel stereo oscillator, a tinnitus notch filter, and a noise generator.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Pages

### Oscillator

A stereo dual-oscillator synth. Left and right channels are fully independent.

| Control | Range | Description |
|---------|-------|-------------|
| FREQ | 20 Hz – 20 kHz | Oscillator frequency |
| VOL | 0 – 1 | Channel volume |
| WAVE | sine / sqr / saw / tri | Waveform type |
| Phase | 0° / 180° | Polarity inversion via gain node set to −1 |
| Enable | on / off | Mutes the channel without stopping the oscillator |

**Binaural mode** locks left/right frequencies to a shared base frequency plus a configurable beat frequency. Presets cover the standard brainwave bands (delta, theta, alpha, beta).

The **power button** in the center starts/stops the `AudioContext`. Settings are saved to `localStorage` and restored on the next visit.

**Knob interaction:** drag up/down to change value · scroll wheel for fine control · click the value to type it in directly.

### Notch Filter

Routes your microphone (or app audio) through one or more notch (band-reject) filters and sends the result to your headphones. Useful for attenuating tinnitus frequencies in real time.

| Control | Range | Description |
|---------|-------|-------------|
| FREQ | 20 Hz – 20 kHz | Center frequency of the notch |
| Q | 1 – 200 | Quality factor — higher = narrower/sharper notch |

The **bandwidth readout** (`BW ≈ X Hz`) shows the affected range: `BW = freq / Q`.

Up to 6 bands can be active simultaneously. Each band can be enabled/disabled or removed individually. The **frequency response chart** shows the combined filter curve in real time.

Signal chain: `Microphone → BiquadFilter(notch) × N → AudioContext.destination → Headphones`

Band settings persist to `localStorage`.

### Noise

A stereo noise generator with three noise colours.

| Control | Range | Description |
|---------|-------|-------------|
| NOISE | white / pink / brown | Noise colour |
| VOL | 0 – 1 | Output volume |
| WIDTH | 0 – 1 | Stereo width (0 = mono, 1 = full stereo) |

Noise is generated in an `AudioWorklet` (`/noise-processor.js`) for glitch-free audio on the main thread.

## Spectrum analyzer

All three pages include a real-time spectrum analyzer. It uses an `AnalyserNode` tapped from each engine's output (FFT size 2048, log-scale 20 Hz – 20 kHz). The analyzer is especially useful on the notch filter page — you can see the tinnitus spike and watch the notch cut into it.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| Space | Toggle play / stop |
| ← / → | Cycle through knobs |
| ↑ / ↓ | Adjust focused knob |
| Escape | Deselect knob |

## Project structure

```
src/
  App.vue                     # Shell with tab navigation
  views/
    OscillatorView.vue        # Dual oscillator page
    NotchView.vue             # Notch filter page
    NoiseView.vue             # Noise generator page
  components/
    Knob.vue                  # Rotary knob (drag / scroll / inline edit)
    WaveKnob.vue              # Waveform selector knob
    NoiseTypeKnob.vue         # Noise colour selector knob
    ChannelPanel.vue          # One oscillator channel (freq + vol + wave + phase)
    FrequencyChart.vue        # SVG frequency response graph
    SpectrumAnalyzer.vue      # Canvas real-time FFT spectrum display
  composables/
    useAudioEngine.ts         # Oscillator + binaural engine
    useNotchFilter.ts         # Notch filter engine
    useNoiseEngine.ts         # Noise generator engine
```

## Tech

- [Vue 3](https://vuejs.org/) with `<script setup>` and TypeScript
- [Vite](https://vitejs.dev/) for dev server and bundling
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — no audio libraries

## Build

```bash
npm run build    # outputs to dist/
npm run preview  # serve the built output locally
```
