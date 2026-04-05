/**
 * AudioWorklet processor for white, pink, and brown noise generation.
 * Outputs stereo with configurable stereo width.
 */
class NoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._type = 'white' // 'white' | 'pink' | 'brown'

    // Pink noise state (Paul Kellet's approximation)
    this._b0 = 0; this._b1 = 0; this._b2 = 0
    this._b3 = 0; this._b4 = 0; this._b5 = 0; this._b6 = 0

    // Brown noise state (per channel)
    this._brownL = 0
    this._brownR = 0

    this.port.onmessage = (e) => {
      if (e.data.type !== undefined) this._type = e.data.type
    }
  }

  static get parameterDescriptors() {
    return [
      { name: 'stereoWidth', defaultValue: 0.5, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ]
  }

  process(_inputs, outputs, parameters) {
    const output = outputs[0]
    if (!output || output.length < 2) return true

    const outL = output[0]
    const outR = output[1]
    const width = parameters.stereoWidth.length > 1 ? parameters.stereoWidth : null
    const widthVal = width ? 0 : parameters.stereoWidth[0]

    for (let i = 0; i < outL.length; i++) {
      const w = width ? width[i] : widthVal
      let sampleL, sampleR

      switch (this._type) {
        case 'pink':
          sampleL = this._pinkSample()
          sampleR = this._pinkSample()
          break
        case 'brown':
          ;[sampleL, sampleR] = this._brownSamples()
          break
        default: // white
          sampleL = Math.random() * 2 - 1
          sampleR = Math.random() * 2 - 1
      }

      // Stereo width: 0 = mono (average), 1 = full stereo (independent)
      const mono = (sampleL + sampleR) * 0.5
      outL[i] = mono * (1 - w) + sampleL * w
      outR[i] = mono * (1 - w) + sampleR * w
    }

    return true
  }

  /** Paul Kellet's pink noise approximation */
  _pinkSample() {
    const white = Math.random() * 2 - 1
    this._b0 = 0.99886 * this._b0 + white * 0.0555179
    this._b1 = 0.99332 * this._b1 + white * 0.0750759
    this._b2 = 0.96900 * this._b2 + white * 0.1538520
    this._b3 = 0.86650 * this._b3 + white * 0.3104856
    this._b4 = 0.55000 * this._b4 + white * 0.5329522
    this._b5 = -0.7616 * this._b5 - white * 0.0168980
    const pink = this._b0 + this._b1 + this._b2 + this._b3 + this._b4 + this._b5 + this._b6 + white * 0.5362
    this._b6 = white * 0.115926
    return pink * 0.11
  }

  /** Brown noise with per-channel state */
  _brownSamples() {
    const whiteL = Math.random() * 2 - 1
    const whiteR = Math.random() * 2 - 1
    this._brownL += whiteL * 0.02
    this._brownR += whiteR * 0.02
    this._brownL *= 0.998
    this._brownR *= 0.998
    this._brownL = Math.max(-1, Math.min(1, this._brownL))
    this._brownR = Math.max(-1, Math.min(1, this._brownR))
    return [this._brownL * 3.5, this._brownR * 3.5]
  }
}

registerProcessor('noise-processor', NoiseProcessor)
