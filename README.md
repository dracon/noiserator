# Noiserator

A browser-based audio tool built with Vue 3 + TypeScript and the Web Audio API. It has two pages: a dual-channel stereo oscillator and a tinnitus notch filter.

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

The **power button** in the center starts/stops the `AudioContext`. Settings are saved to `localStorage` and restored on the next visit.

**Knob interaction:** drag up/down to change value · scroll wheel for fine control · click the wave knob to cycle waveforms.

### Notch Filter

Routes your microphone through one or more notch (band-reject) filters and sends the result to your headphones. Useful for attenuating tinnitus frequencies in real time.

| Control | Range | Description |
|---------|-------|-------------|
| FREQ | 20 Hz – 20 kHz | Center frequency of the notch |
| Q | 1 – 200 | Quality factor — higher = narrower/sharper notch |

The **bandwidth readout** (`BW ≈ X Hz`) shows the affected range: `BW = freq / Q`.

Up to 6 bands can be active simultaneously. Each band can be enabled/disabled or removed individually. The **frequency response chart** shows the combined filter curve in real time.

Signal chain: `Microphone → BiquadFilter(notch) × N → AudioContext.destination → Headphones`

Band settings persist to `localStorage`.

## Project structure

```
src/
  App.vue                     # Shell with tab navigation
  views/
    OscillatorView.vue        # Dual oscillator page
    NotchView.vue             # Notch filter page
  components/
    Knob.vue                  # Rotary knob (drag / scroll)
    WaveKnob.vue              # Waveform selector knob
    ChannelPanel.vue          # One oscillator channel (freq + vol + wave + phase)
    FrequencyChart.vue        # SVG frequency response graph
  composables/
    useAudioEngine.ts         # Oscillator audio engine + localStorage persistence
    useNotchFilter.ts         # Notch filter engine + localStorage persistence
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
