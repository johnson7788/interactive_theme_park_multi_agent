'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Application, ApplicationConfig } from '@/lib/application';
import { DeviceState } from '@/lib/constants';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useVoiceChat() {
  const [deviceState, setDeviceState] = useState<DeviceState>(DeviceState.IDLE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [emotion, setEmotion] = useState<string>('neutral');

  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    appRef.current = Application.getInstance();

    return () => {
      if (appRef.current) {
        appRef.current.shutdown();
      }
    };
  }, []);

  const initialize = useCallback(async (config: ApplicationConfig) => {
    if (!appRef.current) return false;

    try {
      appRef.current.onDeviceStateChanged((state) => {
        setDeviceState(state);
      });

      appRef.current.onIncomingJson((data) => {
        const msgType = data.type;

        if (msgType === 'tts') {
          const text = data.text;
          if (text) {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: text,
                timestamp: new Date(),
              },
            ]);
          }
        } else if (msgType === 'stt') {
          const text = data.text;
          if (text) {
            setMessages((prev) => [
              ...prev,
              {
                role: 'user',
                content: text,
                timestamp: new Date(),
              },
            ]);
          }
        } else if (msgType === 'llm') {
          const emotionValue = data.emotion;
          if (emotionValue) {
            setEmotion(emotionValue);
          }
        }
      });

      appRef.current.onNetworkError((errorMsg) => {
        setError(errorMsg);
      });

      const success = await appRef.current.initialize(config);
      setIsInitialized(success);
      return success;
    } catch (err) {
      console.error('Failed to initialize:', err);
      setError(String(err));
      return false;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!appRef.current) return;
    await appRef.current.startAutoConversation();
  }, []);

  const stopListening = useCallback(async () => {
    if (!appRef.current) return;
    await appRef.current.stopConversation();
  }, []);

  const startManualListening = useCallback(async () => {
    if (!appRef.current) return;
    await appRef.current.startListeningManual();
  }, []);

  const stopManualListening = useCallback(async () => {
    if (!appRef.current) return;
    await appRef.current.stopListeningManual();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    deviceState,
    messages,
    error,
    emotion,
    isInitialized,
    initialize,
    startListening,
    stopListening,
    startManualListening,
    stopManualListening,
    clearMessages,
    clearError,
  };
}
