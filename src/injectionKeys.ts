import type { InjectionKey } from 'vue'
import type { AudioEngineReturn } from './composables/useAudioEngine'
import type { NoiseEngineReturn }  from './composables/useNoiseEngine'
import type { SessionTimerReturn } from './composables/useSessionTimer'
import type { RecorderReturn } from './composables/useRecorder'
import type { usePresetManager } from './composables/usePresetManager'

export const AudioEngineKey:  InjectionKey<AudioEngineReturn>  = Symbol('audioEngine')
export const NoiseEngineKey:  InjectionKey<NoiseEngineReturn>  = Symbol('noiseEngine')
export const SessionTimerKey: InjectionKey<SessionTimerReturn> = Symbol('sessionTimer')
export const RecorderKey:     InjectionKey<RecorderReturn>     = Symbol('recorder')
export const PresetManagerKey: InjectionKey<ReturnType<typeof usePresetManager>> = Symbol('presetManager')
