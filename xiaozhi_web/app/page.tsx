'use client';

import { useState } from 'react';
import { ConnectionForm } from '@/components/voice-chat/connection-form';
import { ChatInterface } from '@/components/voice-chat/chat-interface';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useVoiceChat } from '@/hooks/use-voice-chat';
import { ApplicationConfig } from '@/lib/application';

export default function Home() {
  const [isConnecting, setIsConnecting] = useState(false);
  const {
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
  } = useVoiceChat();

  const handleConnect = async (config: ApplicationConfig) => {
    setIsConnecting(true);
    try {
      await initialize(config);
    } catch (err) {
      console.error('Connection failed:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="container mx-auto space-y-6">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-bold text-slate-900">小智AI语音助手</h1>
          <p className="text-slate-600">智能语音对话系统</p>
        </div>

        {error && (
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertDescription>
              {error}
              <button
                onClick={clearError}
                className="ml-2 underline"
              >
                关闭
              </button>
            </AlertDescription>
          </Alert>
        )}

        {!isInitialized ? (
          <ConnectionForm onConnect={handleConnect} isConnecting={isConnecting} />
        ) : (
          <ChatInterface
            deviceState={deviceState}
            messages={messages}
            emotion={emotion}
            onStartListening={startListening}
            onStopListening={stopListening}
            onManualStart={startManualListening}
            onManualStop={stopManualListening}
            onClearMessages={clearMessages}
          />
        )}
      </div>
    </div>
  );
}
