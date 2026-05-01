<script setup lang="ts">
import { inject, ref, computed, watch } from "vue";
import Knob from "../components/Knob.vue";
import Fader from "../components/Fader.vue";
import VuMeter from "../components/VuMeter.vue";
import {
    AudioEngineKey,
    NoiseEngineKey,
    SessionTimerKey,
    RecorderKey,
    PresetManagerKey,
} from "../injectionKeys";

const audioEngine = inject(AudioEngineKey)!;
const noiseEngine = inject(NoiseEngineKey)!;
const timer = inject(SessionTimerKey)!;
const recorder = inject(RecorderKey)!;
const presetManager = inject(PresetManagerKey)!;

const FADE_OPTIONS = [
    { label: "30 sec", value: 30 },
    { label: "1 min", value: 60 },
    { label: "2 min", value: 120 },
    { label: "5 min", value: 300 },
];

const presetName = ref("");
const showSaveModal = ref(false);
const selectedPresetId = ref<string | null>(null);

const customMinutes = ref(Math.round(timer.duration.value / 60));

function applyCustomDuration() {
    const mins = Math.max(1, Math.min(480, customMinutes.value));
    customMinutes.value = mins;
    timer.setDuration(mins * 60);
}

function openSavePresetModal() {
    presetName.value = "";
    showSaveModal.value = true;
}

function savePreset() {
    if (!presetName.value.trim()) return;
    presetManager.savePreset(
        presetName.value,
        {
            left: audioEngine.left.value,
            right: audioEngine.right.value,
            binaural: audioEngine.binaural.value,
        },
        noiseEngine.state.value,
        masterVol.value,
    );
    showSaveModal.value = false;
}

function loadPreset(id: string) {
    const preset = presetManager.loadPreset(id);
    if (!preset) return;
    audioEngine.left.value = { ...preset.audio.left };
    audioEngine.right.value = { ...preset.audio.right };
    audioEngine.binaural.value = { ...preset.audio.binaural };

    // Manually sync frequencies if binaural is enabled, since watchers may not fire
    if (audioEngine.binaural.value.enabled) {
        audioEngine.left.value.frequency = audioEngine.binaural.value.baseFrequency;
        audioEngine.right.value.frequency = audioEngine.binaural.value.baseFrequency + audioEngine.binaural.value.beatFrequency;
    }

    noiseEngine.state.value = { ...preset.noise };
    masterVol.value = preset.masterVolume;
    selectedPresetId.value = id;
}

const activePreset = computed(() =>
    [15, 30, 45, 60].includes(timer.duration.value / 60)
        ? timer.duration.value / 60
        : null,
);

const elapsedFormatted = computed(() => {
    const s = recorder.elapsedSeconds.value;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
});

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const masterVol = ref(0.1);
const muted = ref(true);

const actualMasterGain = computed(() => (muted.value ? 0 : masterVol.value));

const masterAnalyserLeft = computed(() => {
    if (muted.value) return null;
    return (
        audioEngine.masterLeftAnalyserNode.value ??
        noiseEngine.analyserNode.value ??
        null
    );
});
const masterAnalyserRight = computed(() => {
    if (muted.value) return null;
    return (
        audioEngine.masterRightAnalyserNode.value ??
        noiseEngine.analyserNode.value ??
        null
    );
});

watch(
    actualMasterGain,
    (v) => {
        audioEngine.mixGain.value = v;
        noiseEngine.mixGain.value = v;
    },
    { immediate: true },
);
</script>

<template>
    <div class="view">
        <div class="tagline">mixer · session timer</div>

        <div class="mixer-layout">
            <div class="panels-col">
                <!-- Engine mixer -->
                <div class="engines-panel">
                    <div class="panel-header">ENGINES</div>

                    <!-- Oscillator -->
                    <div class="engine-row">
                        <div class="engine-info">
                            <span
                                class="led"
                                :class="{ active: audioEngine.isRunning.value }"
                                style="--led-color: #9b7de0"
                            />
                            <span class="engine-name">OSCILLATOR</span>
                        </div>
                        <button
                            class="engine-btn"
                            :class="{ running: audioEngine.isRunning.value }"
                            @click="audioEngine.toggle()"
                        >
                            {{ audioEngine.isRunning.value ? "STOP" : "START" }}
                        </button>
                        <div class="engine-knobs">
                            <Knob
                                :model-value="audioEngine.left.value.volume"
                                :min="0"
                                :max="1"
                                label="L"
                                :decimals="2"
                                color="#7c5cbf"
                                :size="56"
                                @update:model-value="
                                    audioEngine.left.value.volume = $event
                                "
                            />
                            <Knob
                                :model-value="audioEngine.right.value.volume"
                                :min="0"
                                :max="1"
                                label="R"
                                :decimals="2"
                                color="#00b8d9"
                                :size="56"
                                @update:model-value="
                                    audioEngine.right.value.volume = $event
                                "
                            />
                        </div>
                    </div>

                    <div class="divider" />

                    <!-- Noise -->
                    <div class="engine-row">
                        <div class="engine-info">
                            <span
                                class="led"
                                :class="{ active: noiseEngine.isRunning.value }"
                                style="--led-color: #4ecdc4"
                            />
                            <span class="engine-name">NOISE</span>
                        </div>
                        <button
                            class="engine-btn"
                            :class="{ running: noiseEngine.isRunning.value }"
                            @click="noiseEngine.toggle()"
                        >
                            {{ noiseEngine.isRunning.value ? "STOP" : "START" }}
                        </button>
                        <div class="engine-knobs">
                            <Knob
                                :model-value="noiseEngine.state.value.volume"
                                :min="0"
                                :max="1"
                                label="VOL"
                                :decimals="2"
                                color="#4ecdc4"
                                :size="56"
                                @update:model-value="
                                    noiseEngine.state.value.volume = $event
                                "
                            />
                        </div>
                    </div>
                </div>

                <!-- Session timer -->
                <div class="timer-panel">
                    <div class="panel-header amber">SESSION TIMER</div>

                    <div class="preset-row">
                        <button
                            v-for="m in [15, 30, 45, 60]"
                            :key="m"
                            class="preset-btn"
                            :class="{ active: activePreset === m }"
                            :disabled="timer.status.value !== 'idle'"
                            @click="
                                timer.setDuration(m * 60);
                                customMinutes = m;
                            "
                        >
                            {{ m }} MIN
                        </button>
                    </div>

                    <div class="custom-row">
                        <label class="field-label">CUSTOM</label>
                        <input
                            v-model.number="customMinutes"
                            type="number"
                            min="1"
                            max="480"
                            class="custom-input"
                            :disabled="timer.status.value !== 'idle'"
                            @change="applyCustomDuration"
                        />
                        <span class="field-label">MIN</span>

                        <label class="field-label" style="margin-left: 16px"
                            >FADE</label
                        >
                        <select
                            class="fade-select"
                            :value="timer.fadeDuration.value"
                            :disabled="timer.status.value !== 'idle'"
                            @change="
                                timer.setFadeDuration(
                                    Number(
                                        ($event.target as HTMLSelectElement)
                                            .value,
                                    ),
                                )
                            "
                        >
                            <option
                                v-for="opt in FADE_OPTIONS"
                                :key="opt.value"
                                :value="opt.value"
                            >
                                {{ opt.label }}
                            </option>
                        </select>
                    </div>

                    <div class="timer-controls">
                        <button
                            class="timer-btn"
                            :class="{ cancel: timer.status.value !== 'idle' }"
                            @click="
                                timer.status.value === 'idle'
                                    ? timer.start()
                                    : timer.cancel()
                            "
                        >
                            {{
                                timer.status.value === "idle"
                                    ? "START TIMER"
                                    : "CANCEL"
                            }}
                        </button>
                    </div>

                    <div
                        v-if="timer.status.value !== 'idle'"
                        class="countdown-wrap"
                    >
                        <div class="countdown" :class="timer.status.value">
                            {{ timer.remainingFormatted.value }}
                        </div>
                        <div class="status-label">
                            {{
                                timer.status.value === "fading"
                                    ? "FADING OUT..."
                                    : "RUNNING"
                            }}
                        </div>
                    </div>
                </div>

                <!-- Recording panel -->
                <div class="recording-panel">
                    <div class="panel-header rec-header">
                        RECORDING
                        <span
                            v-if="recorder.isRecording.value"
                            class="rec-dot blink"
                        />
                    </div>

                    <div class="rec-controls">
                        <button
                            class="rec-btn"
                            :class="{ recording: recorder.isRecording.value }"
                            @click="
                                recorder.isRecording.value
                                    ? recorder.stop()
                                    : recorder.start()
                            "
                        >
                            {{ recorder.isRecording.value ? "STOP" : "RECORD" }}
                        </button>
                        <span
                            v-if="recorder.isRecording.value"
                            class="rec-elapsed"
                        >
                            {{ elapsedFormatted }}
                        </span>
                    </div>

                    <div
                        v-if="recorder.recordings.value.length > 0"
                        class="rec-list"
                    >
                        <div
                            v-for="(rec, i) in recorder.recordings.value"
                            :key="rec.url"
                            class="rec-item"
                        >
                            <span class="rec-index"
                                >#{{
                                    recorder.recordings.value.length - i
                                }}</span
                            >
                            <span class="rec-duration">{{
                                formatDuration(rec.duration)
                            }}</span>
                            <span class="rec-time">{{
                                rec.timestamp.toLocaleTimeString()
                            }}</span>
                            <button
                                class="rec-action"
                                @click="recorder.download(rec)"
                            >
                                SAVE
                            </button>
                            <button
                                class="rec-action discard"
                                @click="recorder.discard(rec)"
                            >
                                X
                            </button>
                        </div>
                    </div>

                    <div
                        v-else-if="!recorder.isRecording.value"
                        class="rec-hint"
                    >
                        No recordings yet. Start an engine, then press RECORD.
                    </div>
                </div>

                <!-- Presets panel -->
                <div class="presets-panel">
                    <div class="panel-header preset-header">PRESETS</div>

                    <button
                        class="save-preset-btn"
                        @click="openSavePresetModal"
                    >
                        + SAVE PRESET
                    </button>

                    <div
                        v-if="presetManager.presets.value.length > 0"
                        class="presets-list"
                    >
                        <div
                            v-for="preset in presetManager.presets.value"
                            :key="preset.id"
                            class="preset-item"
                            :class="{ active: selectedPresetId === preset.id }"
                        >
                            <button
                                class="preset-load"
                                @click="loadPreset(preset.id)"
                            >
                                {{ preset.name }}
                            </button>
                            <span class="preset-date">
                                {{ new Date(preset.createdAt).toLocaleDateString() }}
                            </span>
                            <button
                                class="preset-delete"
                                @click="presetManager.deletePreset(preset.id)"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    <div
                        v-else
                        class="presets-hint"
                    >
                        No presets yet. Save your current settings to create one.
                    </div>
                </div>
            </div>
            <!-- end .panels-col -->

            <!-- Master out strip -->
            <div class="master-strip">
                <div class="master-label">MASTER OUT</div>
                <div class="master-controls">
                    <Fader
                        :model-value="masterVol"
                        color="#f0a500"
                        label="OUT"
                        :height="220"
                        @update:model-value="masterVol = $event"
                    />
                    <VuMeter
                        :analyser-node="masterAnalyserLeft"
                        :height="220"
                    />
                    <VuMeter
                        :analyser-node="masterAnalyserRight"
                        :height="220"
                    />
                </div>
                <button
                    class="mute-btn"
                    :class="{ active: muted }"
                    @click="muted = !muted"
                >
                    {{ muted ? "UNMUTE" : "MUTE" }}
                </button>
            </div>
        </div>
        <!-- end .mixer-layout -->

        <!-- Save Preset Modal -->
        <div v-if="showSaveModal" class="modal-overlay" @click.self="showSaveModal = false">
            <div class="modal">
                <div class="modal-header">SAVE PRESET</div>
                <input
                    v-model="presetName"
                    type="text"
                    placeholder="Preset name"
                    class="modal-input"
                    @keyup.enter="savePreset"
                />
                <div class="modal-buttons">
                    <button
                        class="modal-btn cancel"
                        @click="showSaveModal = false"
                    >
                        CANCEL
                    </button>
                    <button
                        class="modal-btn save"
                        :disabled="!presetName.trim()"
                        @click="savePreset"
                    >
                        SAVE
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.view {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
}

.mixer-layout {
    display: flex;
    align-items: flex-start;
    gap: 20px;
}

.panels-col {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.master-strip {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 20px 20px 24px;
    background: var(--panel);
    border: 1px solid color-mix(in srgb, #f0a500 20%, var(--border));
    border-radius: 14px;
    align-self: flex-start;
}

.master-label {
    font-size: 10px;
    letter-spacing: 0.18em;
    color: #f0a500;
    text-transform: uppercase;
}

.master-controls {
    display: flex;
    gap: 6px;
    align-items: flex-start;
}

.mute-btn {
    padding: 5px 20px;
    border-radius: 7px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-dim);
    font-family: inherit;
    font-size: 9px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transition: all 0.2s;
    cursor: pointer;
    width: 100%;
}

.mute-btn:hover {
    color: var(--text);
}

.mute-btn.active {
    border-color: #ff4455;
    color: #ff4455;
    background: color-mix(in srgb, #ff4455 12%, var(--surface));
    box-shadow: 0 0 8px color-mix(in srgb, #ff4455 25%, transparent);
}

.tagline {
    font-size: 10px;
    letter-spacing: 0.2em;
    color: var(--text-dim);
    text-transform: uppercase;
}

/* Engine panel */
.engines-panel {
    display: flex;
    flex-direction: column;
    gap: 0;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 20px 28px 24px;
    width: 560px;
}

.panel-header {
    font-size: 10px;
    letter-spacing: 0.18em;
    color: var(--text-dim);
    text-transform: uppercase;
    margin-bottom: 18px;
}

.panel-header.amber {
    color: #f0a500;
}

.engine-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 0;
}

.engine-info {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 140px;
    flex-shrink: 0;
}

.led {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-dim);
    flex-shrink: 0;
    transition: all 0.2s;
}

.led.active {
    background: var(--led-color);
    box-shadow: 0 0 6px var(--led-color);
}

.engine-name {
    font-size: 10px;
    letter-spacing: 0.14em;
    color: var(--text-dim);
    text-transform: uppercase;
}

.engine-btn {
    padding: 5px 14px;
    border-radius: 7px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-dim);
    font-family: inherit;
    font-size: 9px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transition: all 0.2s;
    width: 68px;
    flex-shrink: 0;
}

.engine-btn:hover {
    color: var(--text);
}

.engine-btn.running {
    border-color: var(--accent);
    color: var(--accent-glow);
    background: color-mix(in srgb, var(--accent) 10%, var(--surface));
}

.engine-knobs {
    display: flex;
    gap: 12px;
    align-items: center;
    flex: 1;
}

.engine-hint {
    font-size: 9px;
    color: var(--text-dim);
    letter-spacing: 0.06em;
    opacity: 0.6;
}

.engine-error {
    font-size: 9px;
    color: #ff6b6b;
    letter-spacing: 0.06em;
}

.divider {
    height: 1px;
    background: var(--border);
    opacity: 0.5;
}

/* Timer panel */
.timer-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    background: var(--panel);
    border: 1px solid color-mix(in srgb, #f0a500 20%, var(--border));
    border-radius: 14px;
    padding: 20px 28px 24px;
    width: 560px;
}

.preset-row {
    display: flex;
    gap: 8px;
}

.preset-btn {
    padding: 6px 16px;
    border-radius: 7px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-dim);
    font-family: inherit;
    font-size: 9px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    transition: all 0.2s;
}

.preset-btn:not(:disabled):hover {
    color: var(--text);
}

.preset-btn.active {
    border-color: #f0a500;
    color: #f0a500;
    background: color-mix(in srgb, #f0a500 10%, var(--surface));
}

.preset-btn:disabled {
    opacity: 0.4;
    cursor: default;
}

.custom-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.field-label {
    font-size: 9px;
    letter-spacing: 0.14em;
    color: var(--text-dim);
    text-transform: uppercase;
}

.custom-input {
    width: 60px;
    padding: 5px 8px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-family: inherit;
    font-size: 11px;
    text-align: center;
}

.custom-input:disabled {
    opacity: 0.4;
}

.custom-input:focus {
    outline: none;
    border-color: #f0a500;
}

.fade-select {
    padding: 5px 8px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-family: inherit;
    font-size: 9px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.fade-select:disabled {
    opacity: 0.4;
}

.fade-select:focus {
    outline: none;
    border-color: #f0a500;
}

.timer-controls {
    display: flex;
    justify-content: center;
}

.timer-btn {
    padding: 8px 32px;
    border-radius: 8px;
    border: 1px solid #f0a500;
    background: color-mix(in srgb, #f0a500 12%, var(--surface));
    color: #f0a500;
    font-family: inherit;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transition: all 0.2s;
}

.timer-btn:hover {
    filter: brightness(1.2);
}

.timer-btn.cancel {
    border-color: var(--border);
    background: var(--surface);
    color: var(--text-dim);
}

.countdown-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
}

.countdown {
    font-size: 40px;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.05em;
    color: #f0a500;
    transition: color 0.3s;
}

.countdown.fading {
    animation: countdown-pulse 0.6s ease-in-out infinite alternate;
}

@keyframes countdown-pulse {
    0% {
        opacity: 1;
    }
    100% {
        opacity: 0.4;
    }
}

.status-label {
    font-size: 9px;
    letter-spacing: 0.2em;
    color: var(--text-dim);
    text-transform: uppercase;
}

/* Recording panel */
.recording-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    background: var(--panel);
    border: 1px solid color-mix(in srgb, #ff4455 20%, var(--border));
    border-radius: 14px;
    padding: 20px 28px 24px;
    width: 560px;
}

.rec-header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #ff4455;
}

.rec-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff4455;
    box-shadow: 0 0 6px #ff4455;
    flex-shrink: 0;
}

.blink {
    animation: rec-blink 0.8s ease-in-out infinite alternate;
}

@keyframes rec-blink {
    0% {
        opacity: 1;
    }
    100% {
        opacity: 0.2;
    }
}

.rec-controls {
    display: flex;
    align-items: center;
    gap: 16px;
}

.rec-btn {
    padding: 8px 32px;
    border-radius: 8px;
    border: 1px solid #ff4455;
    background: color-mix(in srgb, #ff4455 12%, var(--surface));
    color: #ff4455;
    font-family: inherit;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transition: all 0.2s;
}

.rec-btn:hover {
    filter: brightness(1.2);
}

.rec-btn.recording {
    border-color: var(--border);
    background: var(--surface);
    color: var(--text-dim);
}

.rec-elapsed {
    font-size: 24px;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.05em;
    color: #ff4455;
}

.rec-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
}

.rec-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 10px;
    letter-spacing: 0.08em;
}

.rec-index {
    color: var(--text-dim);
    width: 20px;
    flex-shrink: 0;
}

.rec-duration {
    color: var(--text);
    flex-shrink: 0;
    width: 48px;
}

.rec-time {
    color: var(--text-dim);
    flex: 1;
}

.rec-action {
    padding: 4px 10px;
    border-radius: 5px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-dim);
    font-family: inherit;
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    transition: all 0.15s;
}

.rec-action:hover {
    color: var(--text);
    border-color: var(--text-dim);
}

.rec-action.discard:hover {
    color: #ff4455;
    border-color: #ff4455;
}

.rec-hint {
    font-size: 9px;
    color: var(--text-dim);
    letter-spacing: 0.06em;
    opacity: 0.6;
}

/* Presets panel */
.presets-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    background: var(--panel);
    border: 1px solid color-mix(in srgb, #9b7de0 20%, var(--border));
    border-radius: 14px;
    padding: 20px 28px 24px;
    width: 560px;
}

.preset-header {
    color: #9b7de0;
}

.save-preset-btn {
    width: 100%;
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid #9b7de0;
    background: color-mix(in srgb, #9b7de0 12%, var(--surface));
    color: #9b7de0;
    font-family: inherit;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transition: all 0.2s;
}

.save-preset-btn:hover {
    filter: brightness(1.2);
}

.presets-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
}

.preset-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    transition: all 0.2s;
}

.preset-item.active {
    border-color: #9b7de0;
    background: color-mix(in srgb, #9b7de0 8%, var(--surface));
}

.preset-load {
    flex: 1;
    padding: 0;
    border: none;
    background: none;
    color: var(--text);
    font-family: inherit;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-align: left;
    cursor: pointer;
    transition: color 0.2s;
}

.preset-load:hover {
    color: #9b7de0;
}

.preset-date {
    color: var(--text-dim);
    font-size: 9px;
    flex-shrink: 0;
}

.preset-delete {
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: none;
    color: var(--text-dim);
    font-family: inherit;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;
}

.preset-delete:hover {
    color: #ff4455;
    border-color: #ff4455;
}

.presets-hint {
    font-size: 9px;
    color: var(--text-dim);
    letter-spacing: 0.06em;
    opacity: 0.6;
}

/* Modal */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.modal-header {
    font-size: 12px;
    letter-spacing: 0.18em;
    color: var(--text-dim);
    text-transform: uppercase;
}

.modal-input {
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-family: inherit;
    font-size: 12px;
    transition: all 0.2s;
}

.modal-input:focus {
    outline: none;
    border-color: #9b7de0;
    box-shadow: 0 0 8px color-mix(in srgb, #9b7de0 25%, transparent);
}

.modal-buttons {
    display: flex;
    gap: 8px;
}

.modal-btn {
    flex: 1;
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-dim);
    font-family: inherit;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transition: all 0.2s;
    cursor: pointer;
}

.modal-btn:hover:not(:disabled) {
    color: var(--text);
}

.modal-btn.save:not(:disabled) {
    border-color: #9b7de0;
    color: #9b7de0;
    background: color-mix(in srgb, #9b7de0 12%, var(--surface));
}

.modal-btn.save:not(:disabled):hover {
    filter: brightness(1.2);
}

.modal-btn:disabled {
    opacity: 0.4;
    cursor: default;
}
</style>
