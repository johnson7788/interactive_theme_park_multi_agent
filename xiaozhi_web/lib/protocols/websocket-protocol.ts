import { Protocol } from './protocol';
import { AudioConfig } from '@/lib/constants';

export class WebsocketProtocol extends Protocol {
  private ws: WebSocket | null = null;
  private serverUrl: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  async connect(serverUrl: string): Promise<boolean> {
    this.serverUrl = serverUrl;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(serverUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.sendHello().then(() => resolve(true)).catch(reject);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.triggerNetworkError('WebSocket connection error');
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.triggerAudioChannelClosed();
          this.attemptReconnect();
        };

        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  private async sendHello(): Promise<void> {
    const helloMessage = {
      type: 'hello',
      version: 3,
      features: {
        mcp: true,
      },
      transport: 'websocket',
      audio_params: {
        format: 'opus',
        sample_rate: AudioConfig.OUTPUT_SAMPLE_RATE,
        channels: AudioConfig.CHANNELS,
        frame_duration: AudioConfig.FRAME_DURATION,
      },
    };

    await this.sendText(JSON.stringify(helloMessage));
  }

  private handleMessage(data: string | ArrayBuffer): void {
    if (typeof data === 'string') {
      this.handleJsonMessage(data);
    } else {
      this.handleBinaryMessage(data);
    }
  }

  private handleJsonMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      const msgType = message.type;

      if (msgType === 'hello') {
        console.log('Received server hello:', message);
        this.sessionId = message.session_id || '';
        this.triggerAudioChannelOpened();
      } else if (msgType === 'goodbye') {
        const sessionId = message.session_id;
        if (!sessionId || sessionId === this.sessionId) {
          this.handleGoodbye();
        }
      } else {
        this.triggerIncomingJson(message);
      }
    } catch (error) {
      console.error('Failed to parse JSON message:', error);
    }
  }

  private handleBinaryMessage(data: ArrayBuffer): void {
    const audioData = new Uint8Array(data);
    this.triggerIncomingAudio(audioData);
  }

  async sendText(message: string): Promise<boolean> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return false;
    }

    try {
      this.ws.send(message);
      return true;
    } catch (error) {
      console.error('Failed to send text:', error);
      return false;
    }
  }

  async sendAudio(audioData: Uint8Array): Promise<boolean> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return false;
    }

    try {
      this.ws.send(audioData);
      return true;
    } catch (error) {
      console.error('Failed to send audio:', error);
      return false;
    }
  }

  async openAudioChannel(): Promise<boolean> {
    if (!this.serverUrl) {
      console.error('Server URL not set');
      return false;
    }
    return await this.connect(this.serverUrl);
  }

  async closeAudioChannel(): Promise<void> {
    if (this.sessionId) {
      const goodbyeMsg = {
        type: 'goodbye',
        session_id: this.sessionId,
      };
      await this.sendText(JSON.stringify(goodbyeMsg));
    }

    await this.handleGoodbye();
  }

  isAudioChannelOpened(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private async handleGoodbye(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.sessionId = '';
    this.triggerAudioChannelClosed();
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.triggerNetworkError('Failed to reconnect after multiple attempts');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectAttempts * 2000, 30000);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (this.serverUrl) {
        this.connect(this.serverUrl).catch((error) => {
          console.error('Reconnect failed:', error);
        });
      }
    }, delay);
  }
}
