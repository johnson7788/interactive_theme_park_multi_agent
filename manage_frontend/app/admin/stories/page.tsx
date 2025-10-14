'use client';

import { useState, useEffect } from 'react';
import { supabase, type GameTheme } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function StoriesPage() {
  const [themes, setThemes] = useState<GameTheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputData, setInputData] = useState({
    theme_name: '',
    game_theme_id: '',
    scene_setting: '',
    task_types: [] as string[],
  });
  const [outputData, setOutputData] = useState({
    title: '',
    story_content: '',
    generated_tasks: [] as any[],
  });

  useEffect(() => {
    fetchThemes();
  }, []);

  const fetchThemes = async () => {
    try {
      const { data, error } = await supabase
        .from('game_themes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setThemes(data || []);
    } catch (error) {
      toast.error('加载游戏主题失败');
    }
  };

  const handleGenerate = async () => {
    if (!inputData.theme_name || !inputData.scene_setting) {
      toast.error('请填写必要信息');
      return;
    }

    setLoading(true);

    try {
      const mockStory = {
        title: `${inputData.theme_name}的奇幻冒险`,
        story_content: `在遥远的${inputData.scene_setting}，一群勇敢的探险者开始了他们的旅程...\n\n这是一个充满奇遇和挑战的故事，每个参与者都将扮演重要的角色，通过完成各种任务来推动故事的发展。在这个世界里，团队合作、智慧和勇气将是取得成功的关键。\n\n故事的开始，探险者们需要收集线索，解开古老的谜题，同时还要面对各种意想不到的挑战。每个决定都可能改变故事的走向，每个发现都将揭开新的篇章。`,
        generated_tasks: [
          {
            name: '收集神秘碎片',
            type: '采集',
            description: '在指定区域收集5个神秘碎片',
            rewards: { points: 10, badge: '探险者' },
          },
          {
            name: '解答谜题',
            type: '问答',
            description: '回答3个关于故事背景的问题',
            rewards: { points: 15 },
          },
          {
            name: '团队挑战',
            type: '测试',
            description: '与队友合作完成指定挑战',
            rewards: { points: 20, item: '特殊道具' },
          },
        ],
      };

      setOutputData(mockStory);
      toast.success('故事生成成功');
    } catch (error) {
      toast.error('生成失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!outputData.story_content) {
      toast.error('没有可保存的内容');
      return;
    }

    try {
      const { error } = await supabase.from('ai_stories').insert([
        {
          game_theme_id: inputData.game_theme_id || null,
          title: outputData.title,
          content: outputData.story_content,
          generated_tasks: outputData.generated_tasks,
        },
      ]);

      if (error) throw error;
      toast.success('故事已保存');
    } catch (error) {
      toast.error('保存失败');
    }
  };

  const taskTypes = ['问答', '采集', '导流', '测试'];

  const handleTaskTypeToggle = (type: string) => {
    setInputData((prev) => ({
      ...prev,
      task_types: prev.task_types.includes(type)
        ? prev.task_types.filter((t) => t !== type)
        : [...prev.task_types, type],
    }));
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">AI故事生成</h1>
        <p className="mt-2 text-muted-foreground">
          使用AI自动生成游戏故事背景和任务模板
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="mb-6 text-xl font-semibold">输入配置</h2>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="theme_name">主题名称</Label>
              <Input
                id="theme_name"
                value={inputData.theme_name}
                onChange={(e) =>
                  setInputData({ ...inputData, theme_name: e.target.value })
                }
                placeholder="例如：星际探险、魔法世界"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="game_theme_id">关联游戏主题（可选）</Label>
              <Select
                value={inputData.game_theme_id}
                onValueChange={(value) =>
                  setInputData({ ...inputData, game_theme_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择游戏主题" />
                </SelectTrigger>
                <SelectContent>
                  {themes.map((theme) => (
                    <SelectItem key={theme.id} value={theme.id}>
                      {theme.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scene_setting">场景设定</Label>
              <Textarea
                id="scene_setting"
                value={inputData.scene_setting}
                onChange={(e) =>
                  setInputData({ ...inputData, scene_setting: e.target.value })
                }
                placeholder="描述游戏场景、背景故事、角色设定等"
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label>任务类型</Label>
              <div className="grid grid-cols-2 gap-4">
                {taskTypes.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={type}
                      checked={inputData.task_types.includes(type)}
                      onCheckedChange={() => handleTaskTypeToggle(type)}
                    />
                    <label
                      htmlFor={type}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? '生成中...' : '生成故事'}
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">生成结果</h2>
            {outputData.story_content && (
              <Button onClick={handleSave} variant="outline" size="sm" className="gap-2">
                <Save className="h-4 w-4" />
                保存并发布
              </Button>
            )}
          </div>

          <div className="space-y-6">
            {outputData.story_content ? (
              <>
                <div className="space-y-2">
                  <Label>故事标题</Label>
                  <Input
                    value={outputData.title}
                    onChange={(e) =>
                      setOutputData({ ...outputData, title: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>故事内容</Label>
                  <Textarea
                    value={outputData.story_content}
                    onChange={(e) =>
                      setOutputData({
                        ...outputData,
                        story_content: e.target.value,
                      })
                    }
                    rows={12}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label>生成的任务模板</Label>
                  <div className="space-y-3">
                    {outputData.generated_tasks.map((task, index) => (
                      <Card key={index} className="p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="font-semibold">{task.name}</h3>
                          <span className="text-xs rounded-full bg-secondary px-2 py-1">
                            {task.type}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {task.description}
                        </p>
                        <div className="mt-2 text-xs text-muted-foreground">
                          奖励: {JSON.stringify(task.rewards)}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                <div>
                  <Sparkles className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>填写左侧信息后点击生成故事</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
