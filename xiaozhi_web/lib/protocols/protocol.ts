import { ListeningMode, AbortReason } from '@/lib/constants';

export abstract class Protocol {
  protected sessionId: string = '';
  protected onIncomingJsonCallback: ((data: any) => void) | null = null;
  protected onIncomingAudioCallback: ((data: Uint8Array) => void) | null = null;
  protected onAudioChannelOpenedCallback: (() => void) | null = null;
  protected onAudioChannelClosedCallback: (() => void) | null = null;
  protected onNetworkErrorCallback: ((error: string) => void) | null = null;

  onIncomingJson(callback: (data: any) => void): void {
    this.onIncomingJsonCallback = callback;
  }

  onIncomingAudio(callback: (data: Uint8Array) => void): void {
    this.onIncomingAudioCallback = callback;
  }

  onAudioChannelOpened(callback: () => void): void {
    this.onAudioChannelOpenedCallback = callback;
  }

  onAudioChannelClosed(callback: () => void): void {
    this.onAudioChannelClosedCallback = callback;
  }

  onNetworkError(callback: (error: string) => void): void {
    this.onNetworkErrorCallback = callback;
  }

  protected triggerIncomingJson(data: any): void {
    if (this.onIncomingJsonCallback) {
      this.onIncomingJsonCallback(data);
    }
  }

  protected triggerIncomingAudio(data: Uint8Array): void {
    if (this.onIncomingAudioCallback) {
      this.onIncomingAudioCallback(data);
    }
  }

  protected triggerAudioChannelOpened(): void {
    if (this.onAudioChannelOpenedCallback) {
      this.onAudioChannelOpenedCallback();
    }
  }

  protected triggerAudioChannelClosed(): void {
    if (this.onAudioChannelClosedCallback) {
      this.onAudioChannelClosedCallback();
    }
  }

  protected triggerNetworkError(error: string): void {
    if (this.onNetworkErrorCallback) {
      this.onNetworkErrorCallback(error);
    }
  }

  abstract sendText(message: string): Promise<boolean>;
  abstract sendAudio(data: Uint8Array): Promise<boolean>;
  abstract openAudioChannel(): Promise<boolean>;
  abstract closeAudioChannel(): Promise<void>;
  abstract isAudioChannelOpened(): boolean;

  async sendAbortSpeaking(reason: AbortReason | null): Promise<void> {
    const message: any = {
      session_id: this.sessionId,
      type: 'abort',
    };

    if (reason === AbortReason.WAKE_WORD_DETECTED) {
      message.reason = 'wake_word_detected';
    }

    await this.sendText(JSON.stringify(message));
  }

  async sendWakeWordDetected(wakeWord: string): Promise<void> {
    const message = {
      session_id: this.sessionId,
      type: 'listen',
      state: 'detect',
      text: wakeWord,
    };
    await this.sendText(JSON.stringify(message));
  }

  async sendStartListening(mode: ListeningMode): Promise<void> {
    const modeMap: Record<ListeningMode, string> = {
      [ListeningMode.REALTIME]: 'realtime',
      [ListeningMode.AUTO_STOP]: 'auto',
      [ListeningMode.MANUAL]: 'manual',
    };

    const message = {
      session_id: this.sessionId,
      type: 'listen',
      state: 'start',
      mode: modeMap[mode],
    };
    await this.sendText(JSON.stringify(message));
  }

  async sendStopListening(): Promise<void> {
    const message = {
      session_id: this.sessionId,
      type: 'listen',
      state: 'stop',
    };
    await this.sendText(JSON.stringify(message));
  }
}
