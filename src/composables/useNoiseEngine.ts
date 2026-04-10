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

export type NoiseEngineReturn = ReturnType<typeof useNoiseEngine>

export function useNoiseEngine() {
  let ctx: AudioContext | null = null
  let workletNode: AudioWorkletNode | null = null
  let gainNode: GainNode | null = null

  const isRunning = ref(false)
  const analyserNode = ref<AnalyserNode | null>(null)
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

    analyserNode.value = ctx.createAnalyser()
    analyserNode.value.fftSize = 2048
    analyserNode.value.smoothingTimeConstant = 0.8
    gainNode.connect(analyserNode.value)

    isRunning.value = true
  }

  function stop() {
    if (!isRunning.value) return
    workletNode?.disconnect()
    gainNode?.disconnect()
    analyserNode.value?.disconnect()
    workletNode = null
    gainNode = null
    analyserNode.value = null
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

  function fadeOut(duration: number): Promise<void> {
    return new Promise(resolve => {
      if (!isRunning.value || !ctx || !gainNode) { resolve(); return }
      const now = ctx.currentTime
      gainNode.gain.setValueAtTime(gainNode.gain.value, now)
      gainNode.gain.linearRampToValueAtTime(0, now + duration)
      setTimeout(() => { stop(); resolve() }, duration * 1000)
    })
  }

  function cancelFade() {
    if (ctx && gainNode) {
      gainNode.gain.cancelScheduledValues(ctx.currentTime)
      gainNode.gain.setTargetAtTime(1, ctx.currentTime, 0.02)
    }
  }

  onUnmounted(stop)

  return { state, isRunning, toggle, NOISE_TYPES, analyserNode, fadeOut, cancelFade }
}
