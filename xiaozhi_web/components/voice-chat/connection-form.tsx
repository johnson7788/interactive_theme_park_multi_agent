'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApplicationConfig } from '@/lib/application';

interface ConnectionFormProps {
  onConnect: (config: ApplicationConfig) => Promise<void>;
  isConnecting: boolean;
}

export function ConnectionForm({ onConnect, isConnecting }: ConnectionFormProps) {
  const [protocol, setProtocol] = useState<'websocket' | 'mqtt'>('websocket');

  const [websocketUrl, setWebsocketUrl] = useState('ws://localhost:8080');

  const [mqttEndpoint, setMqttEndpoint] = useState('');
  const [mqttClientId, setMqttClientId] = useState('');
  const [mqttUsername, setMqttUsername] = useState('');
  const [mqttPassword, setMqttPassword] = useState('');
  const [mqttPublishTopic, setMqttPublishTopic] = useState('');
  const [mqttSubscribeTopic, setMqttSubscribeTopic] = useState('');

  const handleWebSocketConnect = async () => {
    const config: ApplicationConfig = {
      protocol: 'websocket',
      serverUrl: websocketUrl,
    };
    await onConnect(config);
  };

  const handleMqttConnect = async () => {
    const config: ApplicationConfig = {
      protocol: 'mqtt',
      mqttConfig: {
        endpoint: mqttEndpoint,
        clientId: mqttClientId,
        username: mqttUsername,
        password: mqttPassword,
        publishTopic: mqttPublishTopic,
        subscribeTopic: mqttSubscribeTopic || null,
      },
    };
    await onConnect(config);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>连接小智AI助手</CardTitle>
        <CardDescription>选择连接方式并填写配置信息</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={protocol} onValueChange={(v) => setProtocol(v as 'websocket' | 'mqtt')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="websocket">WebSocket</TabsTrigger>
            <TabsTrigger value="mqtt">MQTT</TabsTrigger>
          </TabsList>

          <TabsContent value="websocket" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ws-url">WebSocket URL</Label>
              <Input
                id="ws-url"
                type="text"
                placeholder="ws://localhost:8080"
                value={websocketUrl}
                onChange={(e) => setWebsocketUrl(e.target.value)}
              />
            </div>
            <Button
              onClick={handleWebSocketConnect}
              disabled={isConnecting || !websocketUrl}
              className="w-full"
            >
              {isConnecting ? '连接中...' : '连接'}
            </Button>
          </TabsContent>

          <TabsContent value="mqtt" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mqtt-endpoint">服务器地址</Label>
              <Input
                id="mqtt-endpoint"
                type="text"
                placeholder="mqtt.example.com:8883"
                value={mqttEndpoint}
                onChange={(e) => setMqttEndpoint(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mqtt-client-id">客户端ID</Label>
              <Input
                id="mqtt-client-id"
                type="text"
                placeholder="client-123"
                value={mqttClientId}
                onChange={(e) => setMqttClientId(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mqtt-username">用户名</Label>
                <Input
                  id="mqtt-username"
                  type="text"
                  value={mqttUsername}
                  onChange={(e) => setMqttUsername(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mqtt-password">密码</Label>
                <Input
                  id="mqtt-password"
                  type="password"
                  value={mqttPassword}
                  onChange={(e) => setMqttPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mqtt-publish-topic">发布主题</Label>
              <Input
                id="mqtt-publish-topic"
                type="text"
                placeholder="device/commands"
                value={mqttPublishTopic}
                onChange={(e) => setMqttPublishTopic(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mqtt-subscribe-topic">订阅主题（可选）</Label>
              <Input
                id="mqtt-subscribe-topic"
                type="text"
                placeholder="device/messages"
                value={mqttSubscribeTopic}
                onChange={(e) => setMqttSubscribeTopic(e.target.value)}
              />
            </div>

            <Button
              onClick={handleMqttConnect}
              disabled={isConnecting || !mqttEndpoint || !mqttClientId || !mqttUsername || !mqttPassword || !mqttPublishTopic}
              className="w-full"
            >
              {isConnecting ? '连接中...' : '连接'}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
