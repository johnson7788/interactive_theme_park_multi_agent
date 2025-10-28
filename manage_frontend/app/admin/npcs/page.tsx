'use client';

import { useState, useEffect } from 'react';
import { supabase, type NPCCharacter, type GameTheme } from '@/lib/supabase';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, User } from 'lucide-react';
import { toast } from 'sonner';

export default function NPCsPage() {
  const [npcs, setNpcs] = useState<NPCCharacter[]>([]);
  const [themes, setThemes] = useState<GameTheme[]>([]);
  const [selectedNpc, setSelectedNpc] = useState<NPCCharacter | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    game_theme_id: '',
    avatar_url: '',
    personality: '活泼',
    dialogue_template: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [npcsRes, themesRes] = await Promise.all([
        supabase.from('npc_characters').select('*').order('created_at', { ascending: false }),
        supabase.from('game_themes').select('*'),
      ]);

      if (npcsRes.error) throw npcsRes.error;
      if (themesRes.error) throw themesRes.error;

      setNpcs(npcsRes.data || []);
      setThemes(themesRes.data || []);
      if (npcsRes.data && npcsRes.data.length > 0) {
        setSelectedNpc(npcsRes.data[0]);
      }
    } catch (error) {
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (selectedNpc) {
        const { error } = await supabase
          .from('npc_characters')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', selectedNpc.id);

        if (error) throw error;
        toast.success('NPC更新成功');
      } else {
        const { error } = await supabase
          .from('npc_characters')
          .insert([formData]);

        if (error) throw error;
        toast.success('NPC创建成功');
      }

      fetchData();
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleSelectNpc = (npc: NPCCharacter) => {
    setSelectedNpc(npc);
    setFormData({
      name: npc.name,
      game_theme_id: npc.game_theme_id,
      avatar_url: npc.avatar_url,
      personality: npc.personality,
      dialogue_template: npc.dialogue_template || [],
    });
  };

  const handleNewNpc = () => {
    setSelectedNpc(null);
    setFormData({
      name: '',
      game_theme_id: '',
      avatar_url: '',
      personality: '活泼',
      dialogue_template: [],
    });
  };

  return (
    <div className="flex h-full">
      <div className="w-80 border-r bg-card p-4">
        <div className="mb-4">
          <Button onClick={handleNewNpc} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            新建NPC角色
          </Button>
        </div>

        <div className="space-y-2">
          {loading ? (
            <p className="text-center text-sm text-muted-foreground">加载中...</p>
          ) : npcs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">暂无NPC</p>
          ) : (
            npcs.map((npc) => (
              <button
                key={npc.id}
                onClick={() => handleSelectNpc(npc)}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                  selectedNpc?.id === npc.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={npc.avatar_url} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className="font-medium truncate">{npc.name}</p>
                  <p className="text-xs opacity-80 truncate">{npc.personality}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">NPC角色管理</h1>
          <p className="mt-2 text-muted-foreground">
            管理AI NPC角色及其对话模板
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">角色名称</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="输入NPC名称"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="game_theme_id">所属游戏主题</Label>
                <Select
                  value={formData.game_theme_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, game_theme_id: value })
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
                <Label htmlFor="personality">语气风格</Label>
                <Select
                  value={formData.personality}
                  onValueChange={(value) =>
                    setFormData({ ...formData, personality: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="活泼">活泼</SelectItem>
                    <SelectItem value="温柔">温柔</SelectItem>
                    <SelectItem value="睿智">睿智</SelectItem>
                    <SelectItem value="搞笑">搞笑</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar_url">头像URL</Label>
                <Input
                  id="avatar_url"
                  value={formData.avatar_url}
                  onChange={(e) =>
                    setFormData({ ...formData, avatar_url: e.target.value })
                  }
                  placeholder="输入头像URL"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>角色预览</Label>
              </div>
              <div className="flex items-center gap-4 rounded-xl border p-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={formData.avatar_url} />
                  <AvatarFallback>
                    <User className="h-10 w-10" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">
                    {formData.name || '未命名角色'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formData.personality}风格
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dialogue">对话模板</Label>
              <Textarea
                id="dialogue"
                value={
                  Array.isArray(formData.dialogue_template)
                    ? formData.dialogue_template.join('\n')
                    : ''
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dialogue_template: e.target.value.split('\n').filter((line) => line.trim()),
                  })
                }
                placeholder="输入对话模板，每行一条"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                每行一条对话模板，将用于AI生成对话时的参考
              </p>
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1">
                {selectedNpc ? '保存更改' : '创建NPC'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => toast.info('AI生成功能开发中')}
              >
                AI生成对话模板
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
