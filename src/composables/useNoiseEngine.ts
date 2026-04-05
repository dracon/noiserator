import { ref, watch, onUnmounted } from 'vue'

export type NoiseType = 'white' | 'pink' | 'brown'

export interface NoiseState {
  noiseType: NoiseType
  volume: number
  stereoWidth: number
}

const NOISE_TYPES: NoiseType[] = ['white', 'pink', 'brown']

const STORAGE_KEY = 'noiserator-noise'

const DEFAULTS: NoiseState = { noiseType: 'white', volume: 0.25, stereoWidth: 0.5 }

function loadSettings(): NoiseState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    // ignore corrupt storage
  }
  return { ...DEFAULTS }
}

function saveSettings(state: NoiseState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function useNoiseEngine() {
  let ctx: AudioContext | null = null
  let workletNode: AudioWorkletNode | null = null
  let gainNode: GainNode | null = null

  const isRunning = ref(false)
  const state = ref<NoiseState>(loadSettings())

  async function start() {
    if (isRunning.value) return
    ctx = new AudioContext()

    await ctx.audioWorklet.addModule('/noise-processor.js')

    workletNode = new AudioWorkletNode(ctx, 'noise-processor', {
      outputChannelCount: [2],
      numberOfOutputs: 1,
    })

    // Set initial noise type
    workletNode.port.postMessage({ type: state.value.noiseType })

    // Set initial stereo width
    const widthParam = workletNode.parameters.get('stereoWidth')
    if (widthParam) widthParam.value = state.value.stereoWidth

    gainNode = ctx.createGain()
    gainNode.gain.value = state.value.volume

    workletNode.connect(gainNode)
    gainNode.connect(ctx.destination)

    isRunning.value = true
  }

  function stop() {
    if (!isRunning.value) return
    workletNode?.disconnect()
    gainNode?.disconnect()
    workletNode = null
    gainNode = null
    ctx?.close()
    ctx = null
    isRunning.value = false
  }

  function toggle() {
    isRunning.value ? stop() : start()
  }

  // Sync noise type
  watch(() => state.value.noiseType, v => {
    workletNode?.port.postMessage({ type: v })
  })

  // Sync volume
  watch(() => state.value.volume, v => {
    if (gainNode && ctx) gainNode.gain.setTargetAtTime(v, ctx.currentTime, 0.01)
  })

  // Sync stereo width
  watch(() => state.value.stereoWidth, v => {
    if (workletNode && ctx) {
      const param = workletNode.parameters.get('stereoWidth')
      if (param) param.setTargetAtTime(v, ctx.currentTime, 0.01)
    }
  })

  // Persist
  watch(state, () => saveSettings(state.value), { deep: true })

  onUnmounted(stop)

  return { state, isRunning, toggle, NOISE_TYPES }
}
