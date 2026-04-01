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

const STORAGE_KEY = 'noiserator-settings'

const DEFAULT_LEFT: ChannelState = { frequency: 220, volume: 0.25, wave: 'sine', enabled: true, inverted: false }
const DEFAULT_RIGHT: ChannelState = { frequency: 440, volume: 0.25, wave: 'sine', enabled: true, inverted: false }

function loadSettings(): { left: ChannelState; right: ChannelState } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        left: { ...DEFAULT_LEFT, ...parsed.left },
        right: { ...DEFAULT_RIGHT, ...parsed.right },
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return { left: { ...DEFAULT_LEFT }, right: { ...DEFAULT_RIGHT } }
}

function saveSettings(left: ChannelState, right: ChannelState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, right }))
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

  const saved = loadSettings()
  const left = ref<ChannelState>(saved.left)
  const right = ref<ChannelState>(saved.right)

  function buildGraph() {
    if (!ctx) return

    masterGain = ctx.createGain()
    masterGain.gain.value = 1
    masterGain.connect(ctx.destination)

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
    leftOsc = null
    rightOsc = null
    leftPhase = null
    rightPhase = null
    leftGain = null
    rightGain = null
    merger = null
    masterGain = null
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

  // Persist any state change to localStorage
  watch([left, right], () => saveSettings(left.value, right.value), { deep: true })

  onUnmounted(stop)

  return { left, right, isRunning, toggle, WAVES }
}
