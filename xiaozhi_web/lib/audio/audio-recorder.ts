import { AudioConfig } from '@/lib/constants';

export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isRecording: boolean = false;
  private onAudioDataCallback: ((data: Float32Array) => void) | null = null;

  async start(): Promise<boolean> {
    if (this.isRecording) {
      console.warn('Already recording');
      return true;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: AudioConfig.INPUT_SAMPLE_RATE,
        },
      });

      this.audioContext = new AudioContext({
        sampleRate: AudioConfig.INPUT_SAMPLE_RATE,
      });

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      const bufferSize = 4096;
      this.processorNode = this.audioContext.createScriptProcessor(
        bufferSize,
        AudioConfig.CHANNELS,
        AudioConfig.CHANNELS
      );

      this.processorNode.onaudioprocess = (event) => {
        if (this.isRecording && this.onAudioDataCallback) {
          const audioData = event.inputBuffer.getChannelData(0);
          this.onAudioDataCallback(audioData);
        }
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isRecording = true;
      console.log('Audio recording started');
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }

  stop(): void {
    if (!this.isRecording) {
      return;
    }

    this.isRecording = false;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    console.log('Audio recording stopped');
  }

  onAudioData(callback: (data: Float32Array) => void): void {
    this.onAudioDataCallback = callback;
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }
}