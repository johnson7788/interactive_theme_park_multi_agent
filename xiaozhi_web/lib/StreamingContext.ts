// lib/StreamingContext.ts
import BlockingQueue from './BlockingQueue';

export type OpusDecoder = {
  decode: (opus: Uint8Array)=> Int16Array;
};

export class StreamingContext {
  private opusDecoder: OpusDecoder;
  private audioContext: AudioContext;
  private sampleRate: number;
  private channels: number;
  private minAudioDuration: number;

  private queue: number[] = [];
  private activeQueue = new BlockingQueue<number>();
  private pending: Uint8Array[] = [];
  private inputQueue = new BlockingQueue<Uint8Array>();

  public playing = false;
  public endOfStream = false;
  public lastPlayTime = 0;

  constructor(decoder: OpusDecoder, audioContext: AudioContext, sampleRate:number, channels:number, minAudioDuration:number) {
    this.opusDecoder = decoder;
    this.audioContext = audioContext;
    this.sampleRate = sampleRate;
    this.channels = channels;
    this.minAudioDuration = minAudioDuration;
  }

  pushAudioBuffer(items: Uint8Array[]) {
    this.inputQueue.enqueue(...items);
  }

  private async swapPending() {
    const data = await this.inputQueue.dequeue(1);
    this.pending = data;
  }

  private int16ToFloat32(int16: Int16Array) {
    const f = new Float32Array(int16.length);
    for (let i=0;i<int16.length;i++) f[i] = int16[i]/(int16[i]<0?0x8000:0x7FFF);
    return f;
  }

  async decodeOpusFrames() {
    // 永久协程，持续解码
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await this.swapPending();
      if (this.pending.length===0) continue;

      const decodedAll: number[] = [];
      for (const frame of this.pending) {
        try {
          const pcm = this.opusDecoder.decode(frame); // Int16
          if (pcm && pcm.length>0) {
            const f32 = this.int16ToFloat32(pcm);
            for (let i=0;i<f32.length;i++) decodedAll.push(f32[i]);
          }
        } catch {}
      }
      if (decodedAll.length>0) {
        this.activeQueue.enqueue(...decodedAll);
      }
    }
  }

  private async fill(minSamples:number) {
    const need = Math.max(1, minSamples - this.queue.length);
    const got = await this.activeQueue.dequeue(need);
    this.queue.push(...got);
  }

  async startPlaying() {
    // 永久播放协程
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const minSamples = this.sampleRate * this.minAudioDuration * 3;
      if (!this.playing && this.queue.length < minSamples) {
        await this.fill(minSamples);
      }
      this.playing = true;
      while (this.playing && this.queue.length) {
        const chunk = this.queue.splice(0, Math.min(this.queue.length, this.sampleRate));
        const ab = this.audioContext.createBuffer(this.channels, chunk.length, this.sampleRate);
        ab.copyToChannel(new Float32Array(chunk), 0);
        const src = this.audioContext.createBufferSource();
        src.buffer = ab;

        const gain = this.audioContext.createGain();
        const fade = 0.02;
        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + fade);
        const dur = ab.duration;
        if (dur > fade*2) {
          gain.gain.setValueAtTime(1, this.audioContext.currentTime + dur - fade);
          gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + dur);
        }

        src.connect(gain); gain.connect(this.audioContext.destination);
        this.lastPlayTime = this.audioContext.currentTime;
        src.start();
      }
      await this.fill(minSamples);
    }
  }
}

export function createStreamingContext(decoder: OpusDecoder, audioContext: AudioContext, sampleRate:number, channels:number, minAudioDuration:number) {
  return new StreamingContext(decoder, audioContext, sampleRate, channels, minAudioDuration);
}
