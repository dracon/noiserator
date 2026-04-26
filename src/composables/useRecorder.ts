import { ref } from 'vue'
import type { AudioEngineReturn } from './useAudioEngine'
import type { NoiseEngineReturn } from './useNoiseEngine'
import type { NotchFilterReturn } from './useNotchFilter'

export interface Recording {
  url: string
  filename: string
  timestamp: Date
  duration: number
}

export type RecorderReturn = ReturnType<typeof useRecorder>

export function useRecorder(
  audioEngine: AudioEngineReturn,
  noiseEngine: NoiseEngineReturn,
  notchFilter: NotchFilterReturn,
) {
  const isRecording = ref(false)
  const recordings = ref<Recording[]>([])
  const elapsedSeconds = ref(0)

  let mediaRecorder: MediaRecorder | null = null
  let mixingCtx: AudioContext | null = null
  let chunks: Blob[] = []
  let tickInterval: ReturnType<typeof setInterval> | null = null
  let recordStartTime = 0

  function start() {
    if (isRecording.value) return

    // Snapshot active engine streams at record time
    const engines = [
      { stream: audioEngine.recordingStream.value, running: audioEngine.isRunning.value },
      { stream: noiseEngine.recordingStream.value, running: noiseEngine.isRunning.value },
      { stream: notchFilter.recordingStream.value, running: notchFilter.isRunning.value },
    ].filter(e => e.running && e.stream !== null) as { stream: MediaStream; running: true }[]

    if (engines.length === 0) return

    mixingCtx = new AudioContext()
    const mixDest = mixingCtx.createMediaStreamDestination()

    for (const { stream } of engines) {
      const src = mixingCtx.createMediaStreamSource(stream)
      src.connect(mixDest)
    }

    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', '']
      .find(t => t === '' || MediaRecorder.isTypeSupported(t)) ?? ''

    mediaRecorder = new MediaRecorder(mixDest.stream, mimeType ? { mimeType } : undefined)
    chunks = []

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mediaRecorder!.mimeType || 'audio/webm' })
      const url = URL.createObjectURL(blob)
      const now = new Date()
      const ext = blob.type.includes('ogg') ? 'ogg' : 'webm'
      const duration = Math.round((Date.now() - recordStartTime) / 1000)

      recordings.value.unshift({
        url,
        filename: `noiserator-${now.toISOString().replace(/[:.]/g, '-')}.${ext}`,
        timestamp: now,
        duration,
      })

      mixingCtx?.close()
      mixingCtx = null
      chunks = []
    }

    mediaRecorder.start()
    recordStartTime = Date.now()
    isRecording.value = true
    elapsedSeconds.value = 0
    tickInterval = setInterval(() => {
      elapsedSeconds.value++
    }, 1000)
  }

  function stop() {
    if (!isRecording.value || !mediaRecorder) return
    if (tickInterval) {
      clearInterval(tickInterval)
      tickInterval = null
    }
    mediaRecorder.stop()
    isRecording.value = false
    elapsedSeconds.value = 0
  }

  function download(recording: Recording) {
    const a = document.createElement('a')
    a.href = recording.url
    a.download = recording.filename
    a.click()
  }

  function discard(recording: Recording) {
    URL.revokeObjectURL(recording.url)
    recordings.value = recordings.value.filter(r => r !== recording)
  }

  return { isRecording, recordings, elapsedSeconds, start, stop, download, discard }
}
