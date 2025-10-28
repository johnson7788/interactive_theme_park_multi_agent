import mqtt from 'mqtt';
import { Protocol } from './protocol';
import { AudioConfig, ListeningMode, DeviceState } from '@/lib/constants';

interface MqttConfig {
  endpoint: string;
  clientId: string;
  username: string;
  password: string;
  publishTopic: string;
  subscribeTopic: string | null;
}

interface UdpConfig {
  server: string;
  port: number;
  key: string;
  nonce: string;
}

export class MqttProtocol extends Protocol {
  private mqttClient: mqtt.MqttClient | null = null;
  private udpConfig: UdpConfig | null = null;
  private localSequence: number = 0;
  private remoteSequence: number = 0;
  private serverHelloReceived: boolean = false;
  private config: MqttConfig | null = null;

  async connect(mqttConfig: MqttConfig): Promise<boolean> {
    this.config = mqttConfig;
    this.serverHelloReceived = false;

    try {
      const { endpoint, clientId, username, password, subscribeTopic } = mqttConfig;

      const [host, portStr] = endpoint.includes(':') ? endpoint.split(':') : [endpoint, '8883'];
      const port = parseInt(portStr);
      const useTls = port === 8883;

      const mqttUrl = `${useTls ? 'wss' : 'ws'}://${host}:${port}/mqtt`;

      return new Promise((resolve, reject) => {
        this.mqttClient = mqtt.connect(mqttUrl, {
          clientId,
          username,
          password,
          clean: true,
          reconnectPeriod: 0,
          connectTimeout: 10000,
          keepalive: 60,
        });

        this.mqttClient.on('connect', () => {
          console.log('Connected to MQTT broker');

          if (subscribeTopic && subscribeTopic !== 'null') {
            this.mqttClient?.subscribe(subscribeTopic, { qos: 1 }, (err) => {
              if (err) {
                console.error('Subscribe failed:', err);
                reject(err);
              }
            });
          }

          this.sendHello().then(() => {
            resolve(true);
          }).catch(reject);
        });

        this.mqttClient.on('message', (topic, payload) => {
          this.handleMqttMessage(payload.toString());
        });

        this.mqttClient.on('error', (error) => {
          console.error('MQTT error:', error);
          this.triggerNetworkError(`MQTT error: ${error.message}`);
          reject(error);
        });

        this.mqttClient.on('close', () => {
          console.log('MQTT connection closed');
          this.triggerAudioChannelClosed();
        });

        setTimeout(() => {
          if (!this.serverHelloReceived) {
            reject(new Error('Server hello timeout'));
          }
        }, 10000);
      });
    } catch (error) {
      console.error('Failed to connect:', error);
      this.triggerNetworkError(`Connection failed: ${error}`);
      return false;
    }
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

  private handleMqttMessage(payload: string): void {
    try {
      const data = JSON.parse(payload);
      const msgType = data.type;

      if (msgType === 'hello') {
        console.log('Received server hello:', data);
        this.sessionId = data.session_id || '';
        this.serverHelloReceived = true;

        const transport = data.transport;
        if (transport === 'udp') {
          this.udpConfig = data.udp;
          this.localSequence = 0;
          this.remoteSequence = 0;
        }

        this.triggerAudioChannelOpened();
      } else if (msgType === 'goodbye') {
        const sessionId = data.session_id;
        if (!sessionId || sessionId === this.sessionId) {
          this.handleGoodbye();
        }
      } else {
        this.triggerIncomingJson(data);
      }
    } catch (error) {
      console.error('Failed to parse MQTT message:', error);
    }
  }

  async sendText(message: string): Promise<boolean> {
    if (!this.mqttClient || !this.config) {
      console.error('MQTT client not initialized');
      return false;
    }

    return new Promise((resolve) => {
      this.mqttClient!.publish(
        this.config!.publishTopic,
        message,
        { qos: 1 },
        (error) => {
          if (error) {
            console.error('Failed to publish:', error);
            resolve(false);
          } else {
            resolve(true);
          }
        }
      );
    });
  }

  async sendAudio(audioData: Uint8Array): Promise<boolean> {
    console.warn('MQTT audio sending via UDP not supported in browser');
    return false;
  }

  async openAudioChannel(): Promise<boolean> {
    if (!this.config) {
      console.error('MQTT config not set');
      return false;
    }
    return await this.connect(this.config);
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
    return this.mqttClient?.connected || false;
  }

  private async handleGoodbye(): Promise<void> {
    if (this.mqttClient) {
      this.mqttClient.end(true);
      this.mqttClient = null;
    }

    this.sessionId = '';
    this.localSequence = 0;
    this.remoteSequence = 0;
    this.udpConfig = null;
    this.serverHelloReceived = false;

    this.triggerAudioChannelClosed();
  }
}
