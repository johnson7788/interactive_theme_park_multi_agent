'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, type Checkpoint, type NPCCharacter } from '@/lib/supabase';
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
import { MapPin, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function CheckpointsPage() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [npcs, setNpcs] = useState<NPCCharacter[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    area: '',
    position_x: 0,
    position_y: 0,
    npc_id: '',
    event_config: { type: '问答', description: '' },
  });

  useEffect(() => {
    fetchData();
    loadImageAspectRatio();
  }, []);

  useEffect(() => {
    const updateContainerWidth = () => {
      if (mapContainerRef.current) {
        setContainerWidth(mapContainerRef.current.offsetWidth);
      }
    };

    updateContainerWidth();
    window.addEventListener('resize', updateContainerWidth);
    return () => window.removeEventListener('resize', updateContainerWidth);
  }, []);

  const loadImageAspectRatio = () => {
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.height / img.width;
      setImageAspectRatio(aspectRatio);
    };
    img.src = '/map.png';
  };

  const fetchData = async () => {
    try {
      const [checkpointsRes, npcsRes] = await Promise.all([
        supabase.from('checkpoints').select('*').order('created_at', { ascending: false }),
        supabase.from('npc_characters').select('*'),
      ]);

      if (checkpointsRes.error) throw checkpointsRes.error;
      if (npcsRes.error) throw npcsRes.error;

      setCheckpoints(checkpointsRes.data || []);
      setNpcs(npcsRes.data || []);
    } catch (error) {
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setFormData((prev) => ({
      ...prev,
      position_x: Math.round(x * 10) / 10,
      position_y: Math.round(y * 10) / 10,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (selectedCheckpoint) {
        const { error } = await supabase
          .from('checkpoints')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', selectedCheckpoint.id);

        if (error) throw error;
        toast.success('打卡点更新成功');
      } else {
        const { error } = await supabase
          .from('checkpoints')
          .insert([formData]);

        if (error) throw error;
        toast.success('打卡点创建成功');
      }

      fetchData();
      resetForm();
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleSelectCheckpoint = (checkpoint: Checkpoint) => {
    setSelectedCheckpoint(checkpoint);
    setFormData({
      name: checkpoint.name,
      area: checkpoint.area,
      position_x: checkpoint.position_x,
      position_y: checkpoint.position_y,
      npc_id: checkpoint.npc_id,
      event_config: checkpoint.event_config || { type: '问答', description: '' },
    });
  };

  const resetForm = () => {
    setSelectedCheckpoint(null);
    setFormData({
      name: '',
      area: '',
      position_x: 0,
      position_y: 0,
      npc_id: '',
      event_config: { type: '问答', description: '' },
    });
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">打卡点配置</h1>
          <p className="mt-2 text-muted-foreground">
            在地图上配置打卡点位置和事件
          </p>
        </div>

        <Card className="p-6">
          <div className="mb-4">
            <Label>园区地图</Label>
            <p className="text-sm text-muted-foreground mb-4">
              点击地图设置打卡点位置
            </p>
          </div>

          <div
            ref={mapContainerRef}
            onClick={handleMapClick}
            className="relative w-full cursor-crosshair rounded-xl border-2 border-gray-300 overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
            style={{
              backgroundImage: 'url(/map.png)',
              backgroundSize: '100% auto',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundColor: '#f8f9fa',
              height: imageAspectRatio && containerWidth ? `${containerWidth * imageAspectRatio}px` : '400px',
            }}
          >
            {checkpoints.map((checkpoint) => {
              const npc = npcs.find((n) => n.id === checkpoint.npc_id);
              return (
                <button
                  key={checkpoint.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectCheckpoint(checkpoint);
                  }}
                  className={`absolute flex flex-col items-center gap-1 transition-transform hover:scale-110 ${
                    selectedCheckpoint?.id === checkpoint.id ? 'scale-125' : ''
                  }`}
                  style={{
                    left: `${checkpoint.position_x}%`,
                    top: `${checkpoint.position_y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full shadow-xl border-2 ${
                      selectedCheckpoint?.id === checkpoint.id
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/30 border-white'
                        : 'bg-white text-primary border-primary/50'
                    }`}
                  >
                    <MapPin className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-medium bg-white/90 backdrop-blur-sm px-2 py-1 rounded shadow-lg whitespace-nowrap border border-white/20">
                    {checkpoint.name}
                  </span>
                </button>
              );
            })}

            {formData.position_x > 0 && !selectedCheckpoint && (
              <div
                className="absolute flex flex-col items-center gap-1"
                style={{
                  left: `${formData.position_x}%`,
                  top: `${formData.position_y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground animate-pulse shadow-xl border-2 border-white">
                  <Plus className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium bg-primary/90 backdrop-blur-sm text-primary-foreground px-2 py-1 rounded shadow-lg border border-white/20">
                  新打卡点
                </span>
              </div>
             )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">已配置打卡点：</span>
              <span className="ml-2 font-semibold">{checkpoints.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">当前坐标：</span>
              <span className="ml-2 font-mono">
                ({formData.position_x.toFixed(1)}, {formData.position_y.toFixed(1)})
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="w-96 border-l bg-card p-6 overflow-y-auto">
        <h2 className="mb-6 text-xl font-semibold">
          {selectedCheckpoint ? '编辑打卡点' : '新建打卡点'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">打卡点名称</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="输入打卡点名称"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="area">所属区域</Label>
            <Input
              id="area"
              value={formData.area}
              onChange={(e) =>
                setFormData({ ...formData, area: e.target.value })
              }
              placeholder="例如：A区、游乐场"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position_x">X坐标 (%)</Label>
              <Input
                id="position_x"
                type="number"
                step="0.1"
                value={formData.position_x}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    position_x: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position_y">Y坐标 (%)</Label>
              <Input
                id="position_y"
                type="number"
                step="0.1"
                value={formData.position_y}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    position_y: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="npc_id">绑定NPC</Label>
            <Select
              value={formData.npc_id}
              onValueChange={(value) =>
                setFormData({ ...formData, npc_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="选择NPC" />
              </SelectTrigger>
              <SelectContent>
                {npcs.map((npc) => (
                  <SelectItem key={npc.id} value={npc.id}>
                    {npc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_type">事件类型</Label>
            <Select
              value={formData.event_config.type}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  event_config: { ...formData.event_config, type: value },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="问答">问答</SelectItem>
                <SelectItem value="采集">采集</SelectItem>
                <SelectItem value="导流">导流</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_description">事件描述</Label>
            <Textarea
              id="event_description"
              value={formData.event_config.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  event_config: {
                    ...formData.event_config,
                    description: e.target.value,
                  },
                })
              }
              placeholder="描述打卡点的事件内容"
              rows={4}
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1 gap-2">
              <Save className="h-4 w-4" />
              {selectedCheckpoint ? '保存更改' : '创建打卡点'}
            </Button>
            {selectedCheckpoint && (
              <Button type="button" variant="outline" onClick={resetForm}>
                取消
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
