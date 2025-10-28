import { AudioConfig } from '@/lib/constants';

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying: boolean = false;
  private currentSource: AudioBufferSourceNode | null = null;

  async initialize(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({
        sampleRate: AudioConfig.OUTPUT_SAMPLE_RATE,
      });
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async playAudio(audioData: Uint8Array): Promise<void> {
    if (!this.audioContext) {
      await this.initialize();
    }

    try {
      const audioBuffer = await this.decodeAudioData(audioData);
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

  private async decodeAudioData(audioData: Uint8Array): Promise<AudioBuffer | null> {
    if (!this.audioContext) {
      return null;
    }

    try {
      return await this.audioContext.decodeAudioData(audioData.buffer.slice(0));
    } catch (error) {
      console.error('Failed to decode audio:', error);
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
  }
}
