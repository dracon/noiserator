import type { InjectionKey } from 'vue'
import type { AudioEngineReturn } from './composables/useAudioEngine'
import type { NoiseEngineReturn }  from './composables/useNoiseEngine'
import type { NotchFilterReturn }  from './composables/useNotchFilter'
import type { SessionTimerReturn } from './composables/useSessionTimer'
import type { RecorderReturn } from './composables/useRecorder'

export const AudioEngineKey:  InjectionKey<AudioEngineReturn>  = Symbol('audioEngine')
export const NoiseEngineKey:  InjectionKey<NoiseEngineReturn>  = Symbol('noiseEngine')
export const NotchFilterKey:  InjectionKey<NotchFilterReturn>  = Symbol('notchFilter')
export const SessionTimerKey: InjectionKey<SessionTimerReturn> = Symbol('sessionTimer')
export const RecorderKey:     InjectionKey<RecorderReturn>     = Symbol('recorder')
