import { AudioConfig } from '@/lib/constants';
import { createOpusDecoder, OpusDecoderHandle } from '@/lib/opus';

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying: boolean = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private opusDecoder: OpusDecoderHandle | null = null;

  async initialize(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({
        sampleRate: AudioConfig.OUTPUT_SAMPLE_RATE,
      });
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // 初始化Opus解码器
    if (!this.opusDecoder) {
      try {
        this.opusDecoder = createOpusDecoder({
          sampleRate: AudioConfig.INPUT_SAMPLE_RATE,
          channels: AudioConfig.CHANNELS,
          frameSize: (AudioConfig.INPUT_SAMPLE_RATE * AudioConfig.FRAME_DURATION) / 1000
        });
      } catch (error) {
        console.error('Failed to initialize Opus decoder:', error);
      }
    }
  }

  async playAudio(audioData: Uint8Array): Promise<void> {
    if (!this.audioContext) {
      await this.initialize();
    }

    try {
      const audioBuffer = await this.decodeOpusAudioData(audioData);
      if (audioBuffer) {
        this.audioQueue.push(audioBuffer);
        if (!this.isPlaying) {
          this.playNextInQueue();
        }
      }
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  }

  private async decodeOpusAudioData(audioData: Uint8Array): Promise<AudioBuffer | null> {
    if (!this.audioContext) {
      return null;
    }

    try {
      // 首先尝试使用Opus解码（录制的音频是Opus编码的）
      if (this.opusDecoder) {
        // 解码Opus数据为Int16 PCM
        const pcmData = this.opusDecoder.decode(audioData);
        
        // 将Int16转换为Float32
        const float32Data = new Float32Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
          float32Data[i] = pcmData[i] / 32768; // 归一化到[-1, 1]范围
        }
        
        // 创建AudioBuffer
        const audioBuffer = this.audioContext.createBuffer(
          AudioConfig.CHANNELS,
          float32Data.length,
          AudioConfig.INPUT_SAMPLE_RATE
        );
        audioBuffer.copyToChannel(float32Data, 0);
        
        return audioBuffer;
      } else {
        console.error('Opus decoder not initialized');
        return null;
      }
    } catch (error) {
      console.error('Failed to decode Opus audio:', error);
      return null;
    }
  }

  private playNextInQueue(): void {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;

    if (!this.audioContext) {
      return;
    }

    this.currentSource = this.audioContext.createBufferSource();
    this.currentSource.buffer = audioBuffer;
    this.currentSource.connect(this.audioContext.destination);

    this.currentSource.onended = () => {
      this.currentSource = null;
      this.playNextInQueue();
    };

    this.currentSource.start();
  }

  stop(): void {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }

    this.audioQueue = [];
    this.isPlaying = false;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  async close(): Promise<void> {
    this.stop();
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    // 释放Opus解码器资源
    if (this.opusDecoder && this.opusDecoder.destroy) {
      this.opusDecoder.destroy();
      this.opusDecoder = null;
    }
  }
}
