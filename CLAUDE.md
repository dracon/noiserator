# CLAUDE.md

## Project overview

Noiserator is a Vue 3 + TypeScript single-page audio tool. It has four pages:
- **Oscillator** — dual-channel stereo oscillator with independent frequency, volume, waveform, and phase controls per channel. Includes a binaural beats mode.
- **Notch Filter** — microphone or app audio → notch filter chain → headphone output for tinnitus relief.
- **Noise** — white/pink/brown noise generator with stereo width control, powered by an `AudioWorklet`.
- **Mixer** — cross-engine control panel with per-engine start/stop + volume knobs, session timer for managed listening, and audio recording with download.

No routing library. Tab state is a single `ref<'oscillator' | 'notch' | 'noise' | 'mixer'>` in `App.vue`.

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

- `src/composables/useSessionTimer.ts` — session timer for managed listening
  - Takes all three audio engines as input
  - Provides `setDuration(seconds)` to set session length; auto-stops all engines when timer expires
  - Exposes `duration`, `remainingTime`, `remainingFormatted`, `status` (`'idle'`, `'running'`, `'paused'`) as reactive refs
  - Used by MixerView to provide preset durations (30 sec, 1 min, 2 min, 5 min) and custom duration input

- `src/composables/useRecorder.ts` — audio recording and export
  - Takes all three engine instances (audioEngine, noiseEngine, notchFilter) as input
  - `start()`: snapshots active engine streams, creates a mixing `AudioContext`, records via `MediaRecorder`
  - `stop()`: finalizes recording, creates blob with `.webm` format
  - Exposes `isRecording`, `recordings` (list of recorded files), `elapsedSeconds`, `start()`, `stop()`, `download()`, `discard()`
  - Stores recordings in memory with object URLs; user can download multiple times

Each composable exposes `analyserNode: Ref<AnalyserNode | null>` — created on start as a branch tap from the output node, nulled on stop. Audio engines also expose `recordingStream: Ref<MediaStream | null>` for recording tap-off.

### Components

- `Knob.vue` — SVG rotary knob. Drag up/down to change value, scroll wheel for fine control, click value to inline-edit. Props: `modelValue`, `min`, `max`, `label`, `unit`, `decimals`, `size`, `color`.
- `WaveKnob.vue` — Same visual as Knob but snaps to 4 wave positions. Click to cycle, drag to scrub.
- `NoiseTypeKnob.vue` — Same visual as WaveKnob but for white/pink/brown noise selection.
- `ChannelPanel.vue` — Composes Knob + WaveKnob + LED toggles for one oscillator channel.
- `FrequencyChart.vue` — Pure SVG frequency response curve. Computes biquad notch magnitude response mathematically (no audio nodes). Log-scale X axis (20 Hz–20 kHz), dB Y axis.
- `SpectrumAnalyzer.vue` — Canvas-based real-time FFT display. Takes `analyserNode: AnalyserNode | null` prop; runs a `requestAnimationFrame` loop drawing a log-scale filled spectrum. Props: `analyserNode`, `color`, `width`, `height`.

### Views

- `OscillatorView.vue`, `NotchView.vue`, `NoiseView.vue` — Individual engine control pages with spectrum analysis.
- `MixerView.vue` — Master control dashboard: per-engine start/stop buttons + volume knobs, plus session timer with preset durations (30 sec–5 min) and custom duration input. Injects all three engines and the session timer to coordinate playback.

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

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **noiserator** (536 symbols, 691 relationships, 11 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/noiserator/context` | Codebase overview, check index freshness |
| `gitnexus://repo/noiserator/clusters` | All functional areas |
| `gitnexus://repo/noiserator/processes` | All execution flows |
| `gitnexus://repo/noiserator/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
