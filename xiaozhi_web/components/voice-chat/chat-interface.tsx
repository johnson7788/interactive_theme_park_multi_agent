'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { DeviceState } from '@/lib/constants';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  deviceState: DeviceState;
  messages: Message[];
  emotion: string;
  onStartListening: () => void;
  onStopListening: () => void;
  onManualStart: () => void;
  onManualStop: () => void;
  onClearMessages: () => void;
}

export function ChatInterface({
  deviceState,
  messages,
  emotion,
  onStartListening,
  onStopListening,
  onManualStart,
  onManualStop,
  onClearMessages,
}: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isListening = deviceState === DeviceState.LISTENING;
  const isSpeaking = deviceState === DeviceState.SPEAKING;
  const isIdle = deviceState === DeviceState.IDLE;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getStateColor = () => {
    switch (deviceState) {
      case DeviceState.LISTENING:
        return 'bg-green-500';
      case DeviceState.SPEAKING:
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStateText = () => {
    switch (deviceState) {
      case DeviceState.LISTENING:
        return '聆听中';
      case DeviceState.SPEAKING:
        return '回复中';
      default:
        return '待命';
    }
  };

  const getEmotionEmoji = () => {
    const emotionMap: Record<string, string> = {
      happy: '😊',
      sad: '😢',
      angry: '😠',
      surprised: '😮',
      neutral: '😐',
      excited: '🤩',
    };
    return emotionMap[emotion] || '😐';
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>小智AI助手</CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={getStateColor()}>{getStateText()}</Badge>
              <span className="text-2xl">{getEmotionEmoji()}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScrollArea className="h-96 w-full rounded-md border p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  点击下方按钮开始对话
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="flex flex-wrap gap-2">
            {isIdle && (
              <Button onClick={onStartListening} className="flex-1">
                <Mic className="mr-2 h-4 w-4" />
                开始对话
              </Button>
            )}

            {isListening && (
              <Button onClick={onStopListening} variant="destructive" className="flex-1">
                <MicOff className="mr-2 h-4 w-4" />
                停止对话
              </Button>
            )}

            <Button
              onMouseDown={onManualStart}
              onMouseUp={onManualStop}
              onTouchStart={onManualStart}
              onTouchEnd={onManualStop}
              variant="outline"
              className="flex-1"
            >
              <Mic className="mr-2 h-4 w-4" />
              按住说话
            </Button>

            <Button onClick={onClearMessages} variant="outline">
              清空消息
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            {isListening && <p>正在聆听您的语音输入...</p>}
            {isSpeaking && <p>小智正在回复...</p>}
            {isIdle && <p>就绪，等待您的指令</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
