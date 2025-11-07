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
      // 请求麦克风权限
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: AudioConfig.INPUT_SAMPLE_RATE,
          channelCount: AudioConfig.CHANNELS,
        },
      });

      // 创建音频上下文
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: AudioConfig.INPUT_SAMPLE_RATE,
      });

      // 等待音频上下文就绪
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // 创建音频源节点
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // 创建分析器用于可视化
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 2048;
      this.sourceNode.connect(analyser);

      // 使用较小的缓冲区大小以减少延迟
      const bufferSize = 2048;
      this.processorNode = this.audioContext.createScriptProcessor(
        bufferSize,
        AudioConfig.CHANNELS,
        AudioConfig.CHANNELS
      );

      // 处理音频数据
      this.processorNode.onaudioprocess = (event) => {
        if (this.isRecording && this.onAudioDataCallback) {
          // 获取左声道数据
          const audioData = event.inputBuffer.getChannelData(0);
          // 创建副本以避免数据被修改
          const audioDataCopy = new Float32Array(audioData);
          this.onAudioDataCallback(audioDataCopy);
        }
      };

      // 连接音频处理链
      this.sourceNode.connect(this.processorNode);
      // 连接到输出以确保处理正常进行（使用静音增益）
      const silent = this.audioContext.createGain();
      silent.gain.value = 0;
      this.processorNode.connect(silent);
      silent.connect(this.audioContext.destination);

      this.isRecording = true;
      console.log('Audio recording started');
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.cleanup();
      return false;
    }
  }

  stop(): void {
    if (!this.isRecording) {
      return;
    }

    this.isRecording = false;
    this.cleanup();
    console.log('Audio recording stopped');
  }

  private cleanup(): void {
    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch (e) {
        console.warn('Error disconnecting processor node:', e);
      }
      this.processorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {
        console.warn('Error disconnecting source node:', e);
      }
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            console.warn('Error stopping track:', e);
          }
        });
      } catch (e) {
        console.warn('Error stopping media stream tracks:', e);
      }
      this.mediaStream = null;
    }

    if (this.audioContext) {
      // 不要立即关闭音频上下文，可能会被其他组件使用
      // 只有在确定不需要时才关闭
      // this.audioContext.close();
      // this.audioContext = null;
    }
  }

  onAudioData(callback: (data: Float32Array) => void): void {
    this.onAudioDataCallback = callback;
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }
}