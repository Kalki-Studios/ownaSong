class ScratchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.channelData = null;
    this.length = 0;
    this.playhead = 0;
    this.rate = 0;
    this.port.onmessage = (event) => {
      const { type, data } = event.data;
      if (type === 'load') {
        this.channelData = data.channelData;
        this.length = this.channelData[0].length;
      } else if (type === 'setRate') {
        this.rate = data.rate;
      } else if (type === 'setPlayhead') {
        this.playhead = data.position;
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (!this.channelData || this.length === 0) return true;
    const frames = output[0].length;

    for (let i = 0; i < frames; i++) {
      this.playhead += this.rate;
      if (this.playhead < 0) this.playhead = 0;
      if (this.playhead > this.length - 2) this.playhead = this.length - 2;

      const i0 = Math.floor(this.playhead);
      const frac = this.playhead - i0;

      for (let ch = 0; ch < output.length; ch++) {
        const data = this.channelData[Math.min(ch, this.channelData.length - 1)];
        const s0 = data[i0] || 0;
        const s1 = data[i0 + 1] || 0;
        output[ch][i] = s0 + (s1 - s0) * frac;
      }
    }

    this.port.postMessage({ type: 'position', playhead: this.playhead });
    return true;
  }
}

registerProcessor('scratch-processor', ScratchProcessor);
