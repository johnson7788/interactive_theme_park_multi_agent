'use client';

import { useState, useEffect } from 'react';
import { api, type Reward } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '积分',
    content: '',
    conditions: {},
    status: '启用',
  });

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
      const response = await api.rewards.getAll();
      setRewards(response.data);
    } catch (error) {
      toast.error('加载奖励列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingReward) {
        await api.rewards.update(editingReward.id, formData);
        toast.success('奖励更新成功');
      } else {
        await api.rewards.create(formData);
        toast.success('奖励创建成功');
      }

      setIsOpen(false);
      resetForm();
      fetchRewards();
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleEdit = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      type: reward.type,
      content: reward.content,
      conditions: reward.conditions,
      status: reward.status,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个奖励吗？')) return;

    try {
      await api.rewards.delete(Number(id));
      toast.success('删除成功');
      fetchRewards();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleToggleStatus = async (reward: Reward) => {
    const newStatus = reward.status === '启用' ? '停用' : '启用';

    try {
      await api.rewards.update(reward.id, {
        ...reward,
        status: newStatus,
      });
      toast.success(`奖励已${newStatus}`);
      fetchRewards();
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '积分',
      content: '',
      conditions: {},
      status: '启用',
    });
    setEditingReward(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">奖励设置</h1>
        <p className="mt-2 text-muted-foreground">
          配置积分奖励规则和特殊奖励
        </p>
      </div>

      <Card className="p-6">
        <div className="mb-6 flex items-center justify-end">
          <Sheet open={isOpen} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                新增奖励
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[500px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>
                  {editingReward ? '编辑奖励' : '新增奖励'}
                </SheetTitle>
              </SheetHeader>

              <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">奖励名称</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="输入奖励名称"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">奖励类型</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="积分">积分奖励</SelectItem>
                      <SelectItem value="限量">限量奖励</SelectItem>
                      <SelectItem value="地点">地点相关</SelectItem>
                      <SelectItem value="时间">时间相关</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">奖励内容</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    placeholder="描述奖励内容"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conditions">触发条件（JSON）</Label>
                  <Textarea
                    id="conditions"
                    value={JSON.stringify(formData.conditions, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setFormData({ ...formData, conditions: parsed });
                      } catch (err) {
                        // Invalid JSON, ignore
                      }
                    }}
                    placeholder='例如：{"points": 100, "time": "17:00"}'
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">状态</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="启用">启用</SelectItem>
                      <SelectItem value="停用">停用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full">
                  {editingReward ? '保存更改' : '创建奖励'}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>

        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>奖励名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>条件</TableHead>
                <TableHead>奖励内容</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : rewards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                rewards.map((reward) => (
                  <TableRow key={reward.id}>
                    <TableCell className="font-medium">{reward.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                        {reward.type}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate font-mono text-xs">
                      {JSON.stringify(reward.conditions)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {reward.content}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={reward.status === '启用'}
                        onCheckedChange={() => handleToggleStatus(reward)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(reward)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(reward.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}