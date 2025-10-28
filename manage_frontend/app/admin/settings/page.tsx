'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Save, TestTube } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [aiConfig, setAiConfig] = useState({
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
  });

  const handleSaveAIConfig = () => {
    toast.success('AI配置已保存');
  };

  const handleTestAPI = () => {
    toast.info('正在测试API连接...');
    setTimeout(() => {
      toast.success('API连接正常');
    }, 1000);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">系统设置</h1>
        <p className="mt-2 text-muted-foreground">
          配置AI参数和系统选项
        </p>
      </div>

      <Tabs defaultValue="ai" className="space-y-6">
        <TabsList>
          <TabsTrigger value="ai">AI配置</TabsTrigger>
          <TabsTrigger value="system">系统设置</TabsTrigger>
        </TabsList>

        <TabsContent value="ai">
          <Card className="p-6">
            <h2 className="mb-6 text-xl font-semibold">AI模型配置</h2>

            <div className="space-y-6 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="model">AI模型</Label>
                <Select
                  value={aiConfig.model}
                  onValueChange={(value) =>
                    setAiConfig({ ...aiConfig, model: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="claude-3">Claude 3</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  选择用于生成故事和对话的AI模型
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature">
                  Temperature: {aiConfig.temperature}
                </Label>
                <Slider
                  value={[aiConfig.temperature]}
                  onValueChange={(value) =>
                    setAiConfig({ ...aiConfig, temperature: value[0] })
                  }
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  控制生成内容的创造性（0-1，数值越高越随机）
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTokens">最大Token数</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  value={aiConfig.maxTokens}
                  onChange={(e) =>
                    setAiConfig({
                      ...aiConfig,
                      maxTokens: parseInt(e.target.value) || 2000,
                    })
                  }
                  min={100}
                  max={4000}
                />
                <p className="text-xs text-muted-foreground">
                  限制AI生成内容的最大长度
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSaveAIConfig} className="gap-2">
                  <Save className="h-4 w-4" />
                  保存配置
                </Button>
                <Button
                  onClick={handleTestAPI}
                  variant="outline"
                  className="gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  测试API
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card className="p-6">
            <h2 className="mb-6 text-xl font-semibold">系统设置</h2>

            <div className="space-y-6 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="siteName">系统名称</Label>
                <Input
                  id="siteName"
                  defaultValue="阿派朗创造力乐园"
                  placeholder="输入系统名称"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pointsPerTask">每任务积分</Label>
                <Input
                  id="pointsPerTask"
                  type="number"
                  defaultValue={10}
                  min={1}
                />
                <p className="text-xs text-muted-foreground">
                  用户完成任务后获得的默认积分
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">时区</Label>
                <Select defaultValue="Asia/Shanghai">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Shanghai">
                      中国标准时间 (UTC+8)
                    </SelectItem>
                    <SelectItem value="America/New_York">
                      美国东部时间 (UTC-5)
                    </SelectItem>
                    <SelectItem value="Europe/London">
                      格林威治时间 (UTC+0)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="gap-2">
                <Save className="h-4 w-4" />
                保存设置
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
