import { ref, watch, onUnmounted } from 'vue'

export type AudioSource = 'mic' | 'app'

export interface NotchBand {
  id: number
  frequency: number
  q: number
  enabled: boolean
}

const STORAGE_KEY = 'noiserator-notch'

let idCounter = 1

function loadBands(): NotchBand[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as NotchBand[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        idCounter = Math.max(...parsed.map(b => b.id)) + 1
        return parsed
      }
    }
  } catch { /* ignore */ }
  return [{ id: idCounter++, frequency: 4000, q: 30, enabled: true }]
}

export type NotchFilterReturn = ReturnType<typeof useNotchFilter>

export function useNotchFilter() {
  let ctx: AudioContext | null = null
  let source: MediaStreamAudioSourceNode | null = null
  let stream: MediaStream | null = null
  let masterGain: GainNode | null = null
  const filterNodes = new Map<number, BiquadFilterNode>()

  const isRunning = ref(false)
  const error = ref<string | null>(null)
  const analyserNode = ref<AnalyserNode | null>(null)
  const sourceMode = ref<AudioSource>('mic')
  const bands = ref<NotchBand[]>(loadBands())

  watch(bands, v => localStorage.setItem(STORAGE_KEY, JSON.stringify(v)), { deep: true })

  function createChain() {
    if (!ctx) return null
    filterNodes.clear()
    const nodes = bands.value
      .filter(b => b.enabled)
      .map(b => {
        const f = ctx!.createBiquadFilter()
        f.type = 'notch'
        f.frequency.value = b.frequency
        f.Q.value = b.q
        filterNodes.set(b.id, f)
        return f
      })
    return nodes
  }

  function reconnect() {
    if (!ctx || !source || !masterGain) return
    try { source.disconnect() } catch { /* ok */ }
    filterNodes.forEach(n => { try { n.disconnect() } catch { /* ok */ } })
    // Detach analyser from masterGain so we can re-attach cleanly below
    if (analyserNode.value) {
      try { masterGain.disconnect(analyserNode.value) } catch { /* ok */ }
    }

    const nodes = createChain()

    if (!analyserNode.value) {
      analyserNode.value = ctx.createAnalyser()
      analyserNode.value.fftSize = 2048
      analyserNode.value.smoothingTimeConstant = 0.8
    }

    if (!nodes || nodes.length === 0) {
      source.connect(masterGain)
    } else {
      source.connect(nodes[0])
      for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1])
      nodes[nodes.length - 1].connect(masterGain)
    }

    masterGain.connect(analyserNode.value)
  }

  async function getStream(): Promise<MediaStream> {
    if (sourceMode.value === 'mic') {
      return navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    }

    // App audio via getDisplayMedia.
    // We request video too because some browsers/drivers require it,
    // then immediately stop all video tracks.
    const s = await navigator.mediaDevices.getDisplayMedia({
      audio: {
        // Mutes the captured tab/window so it doesn't play twice.
        // Works for Chrome tab capture; has no effect on desktop apps.
        suppressLocalAudioPlayback: true,
        echoCancellation: false,
        noiseSuppression: false,
        sampleRate: 48000,
      } as MediaTrackConstraints,
      video: true,
    })
    s.getVideoTracks().forEach(t => t.stop())

    if (s.getAudioTracks().length === 0) {
      throw new Error('No audio captured — make sure to tick "Share audio" in the picker.')
    }
    return s
  }

  async function start() {
    if (isRunning.value) return
    error.value = null
    try {
      stream = await getStream()
      ctx = new AudioContext()
      source = ctx.createMediaStreamSource(stream)

      masterGain = ctx.createGain()
      masterGain.gain.value = 1
      masterGain.connect(ctx.destination)

      // When the app audio stream ends (user closed the share), auto-stop.
      stream.getAudioTracks().forEach(t => {
        t.addEventListener('ended', stop)
      })

      reconnect()
      isRunning.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not start audio capture'
      stream?.getTracks().forEach(t => t.stop())
      stream = null
    }
  }

  function stop() {
    if (!isRunning.value) return
    source?.disconnect()
    filterNodes.forEach(n => n.disconnect())
    filterNodes.clear()
    analyserNode.value?.disconnect()
    analyserNode.value = null
    masterGain?.disconnect()
    masterGain = null
    ctx?.close()
    stream?.getTracks().forEach(t => t.stop())
    ctx = null
    source = null
    stream = null
    isRunning.value = false
  }

  function toggle() {
    isRunning.value ? stop() : start()
  }

  function setSource(mode: AudioSource) {
    if (isRunning.value) stop()
    sourceMode.value = mode
  }

  function addBand() {
    bands.value.push({ id: idCounter++, frequency: 1000, q: 30, enabled: true })
    if (isRunning.value) reconnect()
  }

  function removeBand(id: number) {
    bands.value = bands.value.filter(b => b.id !== id)
    if (isRunning.value) reconnect()
  }

  watch(bands, (newBands) => {
    newBands.forEach(b => {
      const node = filterNodes.get(b.id)
      if (node) {
        node.frequency.setTargetAtTime(b.frequency, ctx!.currentTime, 0.01)
        node.Q.setTargetAtTime(b.q, ctx!.currentTime, 0.01)
      } else if (isRunning.value) {
        reconnect()
      }
    })
    if (isRunning.value) {
      const enabledIds = new Set(newBands.filter(b => b.enabled).map(b => b.id))
      const nodeIds = new Set(filterNodes.keys())
      const changed = [...enabledIds].some(id => !nodeIds.has(id)) ||
                      [...nodeIds].some(id => !enabledIds.has(id))
      if (changed) reconnect()
    }
  }, { deep: true })

  function fadeOut(duration: number): Promise<void> {
    return new Promise(resolve => {
      if (!isRunning.value || !ctx || !masterGain) { resolve(); return }
      const now = ctx.currentTime
      masterGain.gain.setValueAtTime(masterGain.gain.value, now)
      masterGain.gain.linearRampToValueAtTime(0, now + duration)
      setTimeout(() => { stop(); resolve() }, duration * 1000)
    })
  }

  function cancelFade() {
    if (ctx && masterGain) {
      masterGain.gain.cancelScheduledValues(ctx.currentTime)
      masterGain.gain.setTargetAtTime(1, ctx.currentTime, 0.02)
    }
  }

  onUnmounted(stop)

  return { bands, isRunning, error, sourceMode, toggle, setSource, addBand, removeBand, analyserNode, fadeOut, cancelFade }
}
