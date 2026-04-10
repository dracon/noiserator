import { ref, computed } from 'vue'
import type { AudioEngineReturn } from './useAudioEngine'
import type { NoiseEngineReturn }  from './useNoiseEngine'
import type { NotchFilterReturn }  from './useNotchFilter'

export type TimerStatus = 'idle' | 'running' | 'fading'
export type SessionTimerReturn = ReturnType<typeof useSessionTimer>

export function useSessionTimer(
  audioEngine: AudioEngineReturn,
  noiseEngine: NoiseEngineReturn,
  notchFilter: NotchFilterReturn,
) {
  const status       = ref<TimerStatus>('idle')
  const duration     = ref(30 * 60)  // default 30 min in seconds
  const remaining    = ref(0)
  const fadeDuration = ref(2 * 60)   // default 2 min in seconds

  let intervalId: ReturnType<typeof setInterval> | null = null

  const remainingFormatted = computed(() => {
    const m = Math.floor(remaining.value / 60)
    const s = remaining.value % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })

  function tick() {
    if (remaining.value <= 0) {
      triggerFade()
      return
    }
    remaining.value--
    if (remaining.value <= fadeDuration.value && status.value === 'running') {
      status.value = 'fading'
    }
    if (remaining.value <= 0) triggerFade()
  }

  function triggerFade() {
    if (intervalId) { clearInterval(intervalId); intervalId = null }
    const fadeSec = fadeDuration.value
    const engines = [audioEngine, noiseEngine, notchFilter] as const
    Promise.all(
      engines.filter(e => e.isRunning.value).map(e => e.fadeOut(fadeSec))
    ).then(() => {
      status.value = 'idle'
      remaining.value = 0
    })
  }

  function start() {
    if (status.value !== 'idle') return
    remaining.value = duration.value
    status.value = 'running'
    intervalId = setInterval(tick, 1000)
  }

  function cancel() {
    if (intervalId) { clearInterval(intervalId); intervalId = null }
    const engines = [audioEngine, noiseEngine, notchFilter] as const
    engines.forEach(e => { if (e.isRunning.value) e.cancelFade() })
    status.value = 'idle'
    remaining.value = 0
  }

  function setDuration(secs: number) {
    if (status.value === 'idle') duration.value = secs
  }

  function setFadeDuration(secs: number) {
    if (status.value === 'idle') fadeDuration.value = secs
  }

  return {
    status, duration, remaining, fadeDuration, remainingFormatted,
    start, cancel, setDuration, setFadeDuration,
  }
}
