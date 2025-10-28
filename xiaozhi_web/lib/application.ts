import { DeviceState, ListeningMode, AbortReason } from '@/lib/constants';
import { Protocol } from '@/lib/protocols/protocol';
import { MqttProtocol } from '@/lib/protocols/mqtt-protocol';
import { WebsocketProtocol } from '@/lib/protocols/websocket-protocol';
import { AudioRecorder } from '@/lib/audio/audio-recorder';
import { AudioPlayer } from '@/lib/audio/audio-player';

export interface ApplicationConfig {
  protocol: 'mqtt' | 'websocket';
  serverUrl?: string;
  mqttConfig?: {
    endpoint: string;
    clientId: string;
    username: string;
    password: string;
    publishTopic: string;
    subscribeTopic: string | null;
  };
}

export interface StateSnapshot {
  deviceState: DeviceState;
  listeningMode: ListeningMode;
  keepListening: boolean;
  audioOpened: boolean;
}

export class Application {
  private static instance: Application | null = null;

  private protocol: Protocol | null = null;
  private audioRecorder: AudioRecorder;
  private audioPlayer: AudioPlayer;

  private deviceState: DeviceState = DeviceState.IDLE;
  private listeningMode: ListeningMode = ListeningMode.AUTO_STOP;
  private keepListening: boolean = false;
  private running: boolean = false;

  private onDeviceStateChangedCallback: ((state: DeviceState) => void) | null = null;
  private onIncomingJsonCallback: ((data: any) => void) | null = null;
  private onNetworkErrorCallback: ((error: string) => void) | null = null;

  private constructor() {
    this.audioRecorder = new AudioRecorder();
    this.audioPlayer = new AudioPlayer();
  }

  static getInstance(): Application {
    if (!Application.instance) {
      Application.instance = new Application();
    }
    return Application.instance;
  }

  async initialize(config: ApplicationConfig): Promise<boolean> {
    if (this.running) {
      console.warn('Application already running');
      return true;
    }

    try {
      if (config.protocol === 'mqtt') {
        if (!config.mqttConfig) {
          throw new Error('MQTT config required');
        }
        this.protocol = new MqttProtocol();
      } else {
        if (!config.serverUrl) {
          throw new Error('Server URL required for WebSocket');
        }
        this.protocol = new WebsocketProtocol();
      }

      this.setupProtocolCallbacks();

      let connected = false;
      if (config.protocol === 'mqtt' && config.mqttConfig) {
        connected = await (this.protocol as MqttProtocol).connect(config.mqttConfig);
      } else if (config.protocol === 'websocket' && config.serverUrl) {
        connected = await (this.protocol as WebsocketProtocol).connect(config.serverUrl);
      }

      if (!connected) {
        throw new Error('Failed to connect to server');
      }

      await this.audioPlayer.initialize();

      this.running = true;
      console.log('Application initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize application:', error);
      return false;
    }
  }

  private setupProtocolCallbacks(): void {
    if (!this.protocol) return;

    this.protocol.onIncomingJson((data) => {
      this.handleIncomingJson(data);
    });

    this.protocol.onIncomingAudio((data) => {
      this.audioPlayer.playAudio(data);
    });

    this.protocol.onAudioChannelOpened(() => {
      console.log('Audio channel opened');
      this.setDeviceState(DeviceState.LISTENING);
    });

    this.protocol.onAudioChannelClosed(() => {
      console.log('Audio channel closed');
      this.setDeviceState(DeviceState.IDLE);
    });

    this.protocol.onNetworkError((error) => {
      console.error('Network error:', error);
      if (this.onNetworkErrorCallback) {
        this.onNetworkErrorCallback(error);
      }
    });
  }

  private handleIncomingJson(data: any): void {
    const msgType = data.type;

    if (msgType === 'tts') {
      const state = data.state;
      if (state === 'start') {
        if (this.keepListening && this.listeningMode === ListeningMode.REALTIME) {
          this.setDeviceState(DeviceState.LISTENING);
        } else {
          this.setDeviceState(DeviceState.SPEAKING);
        }
      } else if (state === 'stop') {
        if (this.keepListening) {
          this.protocol?.sendStartListening(this.listeningMode);
          this.setDeviceState(DeviceState.LISTENING);
        } else {
          this.setDeviceState(DeviceState.IDLE);
        }
      }
    }

    if (this.onIncomingJsonCallback) {
      this.onIncomingJsonCallback(data);
    }
  }

  async startListeningManual(): Promise<void> {
    if (!this.protocol) {
      console.error('Protocol not initialized');
      return;
    }

    const opened = await this.connectProtocol();
    if (!opened) {
      return;
    }

    this.keepListening = false;

    if (this.deviceState === DeviceState.SPEAKING) {
      await this.protocol.sendAbortSpeaking(null);
      this.setDeviceState(DeviceState.IDLE);
    }

    await this.protocol.sendStartListening(ListeningMode.MANUAL);
    await this.startAudioRecording();
    this.setDeviceState(DeviceState.LISTENING);
  }

  async stopListeningManual(): Promise<void> {
    if (!this.protocol) return;

    await this.protocol.sendStopListening();
    this.stopAudioRecording();
    this.setDeviceState(DeviceState.IDLE);
  }

  async startAutoConversation(): Promise<void> {
    if (!this.protocol) {
      console.error('Protocol not initialized');
      return;
    }

    const opened = await this.connectProtocol();
    if (!opened) {
      return;
    }

    this.listeningMode = ListeningMode.AUTO_STOP;
    this.keepListening = true;

    await this.protocol.sendStartListening(this.listeningMode);
    await this.startAudioRecording();
    this.setDeviceState(DeviceState.LISTENING);
  }

  async stopConversation(): Promise<void> {
    this.keepListening = false;
    this.stopAudioRecording();

    if (this.protocol) {
      await this.protocol.sendStopListening();
    }

    this.setDeviceState(DeviceState.IDLE);
  }

  private async connectProtocol(): Promise<boolean> {
    if (!this.protocol) {
      return false;
    }

    if (this.protocol.isAudioChannelOpened()) {
      return true;
    }

    return await this.protocol.openAudioChannel();
  }

  private async startAudioRecording(): Promise<void> {
    this.audioRecorder.onAudioData(async (audioData) => {
      if (this.protocol && this.deviceState === DeviceState.LISTENING) {
        const pcm16Data = this.floatTo16BitPCM(audioData);
        await this.protocol.sendAudio(pcm16Data);
      }
    });

    await this.audioRecorder.start();
  }

  private stopAudioRecording(): void {
    this.audioRecorder.stop();
  }

  private floatTo16BitPCM(float32Array: Float32Array): Uint8Array {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Uint8Array(buffer);
  }

  private setDeviceState(state: DeviceState): void {
    if (this.deviceState === state) {
      return;
    }

    console.log('Device state changed:', state);
    this.deviceState = state;

    if (this.onDeviceStateChangedCallback) {
      this.onDeviceStateChangedCallback(state);
    }
  }

  getDeviceState(): DeviceState {
    return this.deviceState;
  }

  isIdle(): boolean {
    return this.deviceState === DeviceState.IDLE;
  }

  isListening(): boolean {
    return this.deviceState === DeviceState.LISTENING;
  }

  isSpeaking(): boolean {
    return this.deviceState === DeviceState.SPEAKING;
  }

  getStateSnapshot(): StateSnapshot {
    return {
      deviceState: this.deviceState,
      listeningMode: this.listeningMode,
      keepListening: this.keepListening,
      audioOpened: this.protocol?.isAudioChannelOpened() || false,
    };
  }

  onDeviceStateChanged(callback: (state: DeviceState) => void): void {
    this.onDeviceStateChangedCallback = callback;
  }

  onIncomingJson(callback: (data: any) => void): void {
    this.onIncomingJsonCallback = callback;
  }

  onNetworkError(callback: (error: string) => void): void {
    this.onNetworkErrorCallback = callback;
  }

  async shutdown(): Promise<void> {
    if (!this.running) {
      return;
    }

    console.log('Shutting down application...');
    this.running = false;

    this.stopAudioRecording();

    if (this.protocol) {
      await this.protocol.closeAudioChannel();
      this.protocol = null;
    }

    await this.audioPlayer.close();

    console.log('Application shutdown complete');
  }
}
