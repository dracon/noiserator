import { ref } from 'vue'
import type { ChannelState, BinauralState } from './useAudioEngine'
import type { NoiseState } from './useNoiseEngine'

export interface Preset {
  id: string
  name: string
  createdAt: number
  audio: {
    left: ChannelState
    right: ChannelState
    binaural: BinauralState
  }
  noise: NoiseState
  masterVolume: number
}

const STORAGE_KEY = 'noiserator-presets'

function loadPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore corrupt storage
  }
  return []
}

function savePresets(presets: Preset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}

export function usePresetManager() {
  const presets = ref<Preset[]>(loadPresets())

  function savePreset(
    name: string,
    audio: Preset['audio'],
    noise: NoiseState,
    masterVolume: number,
  ) {
    const preset: Preset = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      audio,
      noise,
      masterVolume,
    }
    presets.value.push(preset)
    savePresets(presets.value)
    return preset
  }

  function loadPreset(id: string): Preset | undefined {
    return presets.value.find((p) => p.id === id)
  }

  function deletePreset(id: string) {
    presets.value = presets.value.filter((p) => p.id !== id)
    savePresets(presets.value)
  }

  function updatePresetName(id: string, newName: string) {
    const preset = presets.value.find((p) => p.id === id)
    if (preset) {
      preset.name = newName
      savePresets(presets.value)
    }
  }

  return {
    presets,
    savePreset,
    loadPreset,
    deletePreset,
    updatePresetName,
  }
}
