export async function createScratchEngine(audioUrl) {
  // 1. Create context
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  
  // 2. Load AudioWorklet module
  await ctx.audioWorklet.addModule('/scratch-processor.js');
  
  // 3. Fetch and decode audio
  const response = await fetch(audioUrl);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  
  // 4. Extract channel data
  const numChannels = audioBuffer.numberOfChannels;
  const channelData = [];
  for (let i = 0; i < numChannels; i++) {
    channelData.push(audioBuffer.getChannelData(i));
  }
  
  // 5. Create node & connect
  const node = new AudioWorkletNode(ctx, 'scratch-processor');
  node.connect(ctx.destination);
  
  // 6. Load data into worklet
  node.port.postMessage({ type: 'load', data: { channelData } });
  
  return {
    ctx,
    node,
    sampleRate: ctx.sampleRate,
    totalSamples: audioBuffer.length,
    setRate: (rate) => {
      node.port.postMessage({ type: 'setRate', data: { rate } });
    },
    setPlayhead: (position) => {
      node.port.postMessage({ type: 'setPlayhead', data: { position } });
    },
    onPosition: (callback) => {
      node.port.onmessage = (event) => {
        if (event.data.type === 'position') {
          callback(event.data.playhead);
        }
      };
    },
    resume: () => ctx.resume(),
    suspend: () => ctx.suspend(),
  };
}
