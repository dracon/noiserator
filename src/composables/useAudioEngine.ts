import { ref, watch, onUnmounted } from 'vue'

export type WaveType = 'sine' | 'square' | 'sawtooth' | 'triangle'

export interface ChannelState {
  frequency: number
  volume: number
  wave: WaveType
  enabled: boolean
  inverted: boolean
}

const WAVES: WaveType[] = ['sine', 'square', 'sawtooth', 'triangle']

export interface BinauralState {
  enabled: boolean
  baseFrequency: number
  beatFrequency: number
  preset: string | null
}

export const BINAURAL_PRESETS: Record<string, { label: string; min: number; max: number; default: number }> = {
  delta: { label: 'DELTA', min: 0.5, max: 4, default: 2 },
  theta: { label: 'THETA', min: 4, max: 8, default: 6 },
  alpha: { label: 'ALPHA', min: 8, max: 13, default: 10 },
  beta:  { label: 'BETA',  min: 13, max: 30, default: 20 },
}

const STORAGE_KEY = 'noiserator-settings'

const DEFAULT_LEFT: ChannelState = { frequency: 220, volume: 0.25, wave: 'sine', enabled: true, inverted: false }
const DEFAULT_RIGHT: ChannelState = { frequency: 440, volume: 0.25, wave: 'sine', enabled: true, inverted: false }
const DEFAULT_BINAURAL: BinauralState = { enabled: false, baseFrequency: 200, beatFrequency: 10, preset: null }

function loadSettings(): { left: ChannelState; right: ChannelState; binaural: BinauralState } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        left: { ...DEFAULT_LEFT, ...parsed.left },
        right: { ...DEFAULT_RIGHT, ...parsed.right },
        binaural: { ...DEFAULT_BINAURAL, ...parsed.binaural },
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return { left: { ...DEFAULT_LEFT }, right: { ...DEFAULT_RIGHT }, binaural: { ...DEFAULT_BINAURAL } }
}

function saveSettings(left: ChannelState, right: ChannelState, binaural: BinauralState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, right, binaural }))
}

export function useAudioEngine() {
  let ctx: AudioContext | null = null
  let leftOsc: OscillatorNode | null = null
  let rightOsc: OscillatorNode | null = null
  let leftPhase: GainNode | null = null
  let rightPhase: GainNode | null = null
  let leftGain: GainNode | null = null
  let rightGain: GainNode | null = null
  let merger: ChannelMergerNode | null = null
  let masterGain: GainNode | null = null

  const isRunning = ref(false)
  const analyserNode = ref<AnalyserNode | null>(null)

  const saved = loadSettings()
  const left = ref<ChannelState>(saved.left)
  const right = ref<ChannelState>(saved.right)
  const binaural = ref<BinauralState>(saved.binaural)

  function buildGraph() {
    if (!ctx) return

    masterGain = ctx.createGain()
    masterGain.gain.value = 1
    masterGain.connect(ctx.destination)

    analyserNode.value = ctx.createAnalyser()
    analyserNode.value.fftSize = 2048
    analyserNode.value.smoothingTimeConstant = 0.8
    masterGain.connect(analyserNode.value)

    merger = ctx.createChannelMerger(2)
    merger.connect(masterGain)

    leftGain = ctx.createGain()
    leftGain.gain.value = left.value.enabled ? left.value.volume : 0
    leftGain.connect(merger, 0, 0)

    leftPhase = ctx.createGain()
    leftPhase.gain.value = left.value.inverted ? -1 : 1
    leftPhase.connect(leftGain)

    rightGain = ctx.createGain()
    rightGain.gain.value = right.value.enabled ? right.value.volume : 0
    rightGain.connect(merger, 0, 1)

    rightPhase = ctx.createGain()
    rightPhase.gain.value = right.value.inverted ? -1 : 1
    rightPhase.connect(rightGain)

    leftOsc = ctx.createOscillator()
    leftOsc.type = left.value.wave
    leftOsc.frequency.value = left.value.frequency
    leftOsc.connect(leftPhase)
    leftOsc.start()

    rightOsc = ctx.createOscillator()
    rightOsc.type = right.value.wave
    rightOsc.frequency.value = right.value.frequency
    rightOsc.connect(rightPhase)
    rightOsc.start()
  }

  function teardown() {
    leftOsc?.stop()
    rightOsc?.stop()
    leftOsc?.disconnect()
    rightOsc?.disconnect()
    leftPhase?.disconnect()
    rightPhase?.disconnect()
    leftGain?.disconnect()
    rightGain?.disconnect()
    merger?.disconnect()
    masterGain?.disconnect()
    analyserNode.value?.disconnect()
    leftOsc = null
    rightOsc = null
    leftPhase = null
    rightPhase = null
    leftGain = null
    rightGain = null
    merger = null
    masterGain = null
    analyserNode.value = null
  }

  function start() {
    if (isRunning.value) return
    ctx = new AudioContext()
    buildGraph()
    isRunning.value = true
  }

  function stop() {
    if (!isRunning.value) return
    teardown()
    ctx?.close()
    ctx = null
    isRunning.value = false
  }

  function toggle() {
    isRunning.value ? stop() : start()
  }

  // Sync left channel params live
  watch(() => left.value.frequency, v => {
    if (leftOsc) leftOsc.frequency.setTargetAtTime(v, ctx!.currentTime, 0.01)
  })
  watch(() => left.value.volume, v => {
    if (leftGain) leftGain.gain.setTargetAtTime(left.value.enabled ? v : 0, ctx!.currentTime, 0.01)
  })
  watch(() => left.value.enabled, v => {
    if (leftGain) leftGain.gain.setTargetAtTime(v ? left.value.volume : 0, ctx!.currentTime, 0.01)
  })
  watch(() => left.value.wave, v => {
    if (leftOsc) leftOsc.type = v
  })
  watch(() => left.value.inverted, v => {
    if (leftPhase) leftPhase.gain.setTargetAtTime(v ? -1 : 1, ctx!.currentTime, 0.005)
  })

  // Sync right channel params live
  watch(() => right.value.frequency, v => {
    if (rightOsc) rightOsc.frequency.setTargetAtTime(v, ctx!.currentTime, 0.01)
  })
  watch(() => right.value.volume, v => {
    if (rightGain) rightGain.gain.setTargetAtTime(right.value.enabled ? v : 0, ctx!.currentTime, 0.01)
  })
  watch(() => right.value.enabled, v => {
    if (rightGain) rightGain.gain.setTargetAtTime(v ? right.value.volume : 0, ctx!.currentTime, 0.01)
  })
  watch(() => right.value.wave, v => {
    if (rightOsc) rightOsc.type = v
  })
  watch(() => right.value.inverted, v => {
    if (rightPhase) rightPhase.gain.setTargetAtTime(v ? -1 : 1, ctx!.currentTime, 0.005)
  })

  // Binaural mode: sync L/R frequencies from base + beat
  watch(() => binaural.value.enabled, enabled => {
    if (enabled) {
      left.value.frequency = binaural.value.baseFrequency
      right.value.frequency = binaural.value.baseFrequency + binaural.value.beatFrequency
      // Sync volume and wave
      right.value.volume = left.value.volume
      right.value.wave = left.value.wave
      left.value.enabled = true
      right.value.enabled = true
    }
  })

  watch(() => binaural.value.baseFrequency, base => {
    if (!binaural.value.enabled) return
    left.value.frequency = base
    right.value.frequency = base + binaural.value.beatFrequency
  })

  watch(() => binaural.value.beatFrequency, beat => {
    if (!binaural.value.enabled) return
    right.value.frequency = binaural.value.baseFrequency + beat
    // Clear preset if user manually adjusts beat
    binaural.value.preset = null
  })

  // Persist any state change to localStorage
  watch([left, right, binaural], () => saveSettings(left.value, right.value, binaural.value), { deep: true })

  onUnmounted(stop)

  return { left, right, binaural, isRunning, toggle, WAVES, BINAURAL_PRESETS, analyserNode }
}
