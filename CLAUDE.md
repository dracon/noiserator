# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Project overview

Noiserator is a Vue 3 + TypeScript single-page audio tool. It has three pages:
- **Oscillator** — dual-channel stereo oscillator with independent frequency, volume, waveform, and phase controls per channel. Includes a binaural beats mode.
- **Noise** — white/pink/brown noise generator with stereo width control, powered by an `AudioWorklet`.
- **Mixer** — cross-engine control panel with per-engine start/stop + volume knobs, session timer for managed listening, and audio recording with download.

No routing library. Tab state is a single `ref<'oscillator' | 'noise' | 'mixer'>` in `App.vue`.

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

- `src/composables/useNoiseEngine.ts` — noise generator engine
  - `AudioWorkletNode` (`/noise-processor.js`) → `GainNode` → `destination`
  - Noise type switched via `workletNode.port.postMessage`; stereo width via `AudioParam`
  - LocalStorage key: `noiserator-noise`

- `src/composables/useSessionTimer.ts` — session timer for managed listening
  - Takes two audio engines as input (audioEngine, noiseEngine)
  - Provides `setDuration(seconds)` to set session length; auto-stops all engines when timer expires
  - Exposes `duration`, `remainingTime`, `remainingFormatted`, `status` (`'idle'`, `'running'`, `'fading'`) as reactive refs
  - Used by MixerView to provide preset durations (30 sec, 1 min, 2 min, 5 min) and custom duration input

- `src/composables/useRecorder.ts` — audio recording and export
  - Takes two engine instances (audioEngine, noiseEngine) as input
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
- `Fader.vue` — Vertical linear fader with LED-style segmented track (20 segments, lit from bottom proportionally to value). Click anywhere on track to jump, drag to sweep, scroll wheel for ±0.02 fine steps. Props: `modelValue` (0–1), `color`, `label`, `height` (px, default 160), `segments` (default 20).
- `VuMeter.vue` — LED-style RMS level meter. Reads time-domain data from `AnalyserNode`, computes smoothed RMS, displays as vertically stacked segments. Props: `analyserNode`, `height` (px, default 160), `segments` (default 20).
- `SpectrumAnalyzer.vue` — Canvas-based real-time FFT display. Takes `analyserNode: AnalyserNode | null` prop; runs a `requestAnimationFrame` loop drawing a log-scale filled spectrum. Props: `analyserNode`, `color`, `width`, `height`.

### Views

- `OscillatorView.vue` — Dual oscillator page. Below the channel panels sits a fader row: a purple `Fader` for L volume and a cyan `Fader` for R volume, with a GROUP toggle in the center that locks both faders to move in sync. The existing VOL knobs in each `ChannelPanel` remain for fine-tuning. `volLinked` (ref) drives the sync; `setLeftVol`/`setRightVol` handlers propagate changes when linked.
- `NoiseView.vue` — Noise engine control page with spectrum analysis.
- `MixerView.vue` — Master control dashboard: per-engine start/stop buttons + volume knobs, master volume fader with L/R VU meters (MASTER OUT strip), session timer with preset durations (30 sec–5 min) and custom duration input. Injects both engines and the session timer to coordinate playback.

### Styling

Global CSS variables are defined in `src/style.css`. All components use scoped styles. No CSS framework. Colors:
- Left oscillator channel: `#7c5cbf` (purple)
- Right oscillator channel: `#00b8d9` (cyan)
- Noise generator: `#4ecdc4` (teal)

## Testing

Playwright e2e only — no unit test framework (no Vitest/Jest).

```bash
npm run test:e2e                       # run all tests
npm run test:e2e -- --grep "pattern"  # run matching tests only
```

- Tests live in `e2e/`. Each spec navigates to `http://localhost:5173` in a real headless Chromium.
- Clear localStorage before tests that depend on default state: `await page.evaluate(() => localStorage.clear())` then `await page.reload()`.
- Stop the dev server: `pkill -f vite`

## Conventions

- All audio parameter changes use `setTargetAtTime` with a short time constant (0.005–0.01 s) to avoid click artefacts.
- State that drives audio is stored in `ref<ChannelState>` and synced to audio nodes via `watch`.
- `localStorage` persistence is handled inside each composable — components and views are unaware of it.
- No external audio or UI libraries — Web Audio API only.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **noiserator** (587 symbols, 718 relationships, 5 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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
