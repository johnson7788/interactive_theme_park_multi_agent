'use client';

import { useState, useEffect } from 'react';
import { api, type TaskTemplate, type GameTheme } from '@/lib/api';
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
import { Plus, Search, Pencil, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskTemplate[]>([]);
  const [themes, setThemes] = useState<GameTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isOpen, setIsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '问答',
    game_theme_id: null as number | null,
    content: '',
    rewards: { points: 0 },
    trigger_conditions: {},
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tasksData, themesData] = await Promise.all([
        api.tasks.getAll(),
        api.themes.getAll().then(res => res.data),
      ]);
      setTasks(tasksData);
      setThemes(themesData);
    } catch (error) {
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTask) {
        await api.tasks.update(editingTask.id, formData);
        toast.success('任务模板更新成功');
      } else {
        await api.tasks.create(formData);
        toast.success('任务模板创建成功');
      }

      setIsOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleEdit = (task: TaskTemplate) => {
    setEditingTask(task);
    setFormData({
      name: task.name,
      type: task.type,
      game_theme_id: task.game_theme_id,
      content: task.content,
      rewards: task.rewards,
      trigger_conditions: task.trigger_conditions,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个任务模板吗？')) return;

    try {
      await api.tasks.delete(id);
      toast.success('删除成功');
      fetchData();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleCopy = async (task: TaskTemplate) => {
    try {
      await api.tasks.create({
        name: `${task.name} (复制)`,
        type: task.type,
        game_theme_id: task.game_theme_id,
        content: task.content,
        rewards: task.rewards,
        trigger_conditions: task.trigger_conditions,
      });
      toast.success('任务模板复制成功');
      fetchData();
    } catch (error) {
      toast.error('复制失败');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '问答',
      game_theme_id: null,
      content: '',
      rewards: { points: 0 },
      trigger_conditions: {},
    });
    setEditingTask(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || task.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">任务模板管理</h1>
        <p className="mt-2 text-muted-foreground">
          管理游戏任务模板及触发条件
        </p>
      </div>

      <Card className="p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索任务..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="问答">问答</SelectItem>
                <SelectItem value="采集">采集</SelectItem>
                <SelectItem value="导流">导流</SelectItem>
                <SelectItem value="测试">测试</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Sheet open={isOpen} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                新建任务
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[500px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>
                  {editingTask ? '编辑任务模板' : '新建任务模板'}
                </SheetTitle>
              </SheetHeader>

              <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">任务名称</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="输入任务名称"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">任务类型</Label>
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
                      <SelectItem value="问答">问答</SelectItem>
                      <SelectItem value="采集">采集</SelectItem>
                      <SelectItem value="导流">导流</SelectItem>
                      <SelectItem value="测试">测试</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="game_theme_id">所属游戏主题</Label>
                  <Select
                    value={formData.game_theme_id?.toString() || ''}
                    onValueChange={(value) =>
                      setFormData({ ...formData, game_theme_id: value ? parseInt(value) : null })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择游戏主题" />
                    </SelectTrigger>
                    <SelectContent>
                      {themes.map((theme) => (
                        <SelectItem key={theme.id} value={theme.id.toString()}>
                          {theme.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">任务内容</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    placeholder="描述任务详情"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points">奖励积分</Label>
                  <Input
                    id="points"
                    type="number"
                    min="0"
                    value={formData.rewards.points}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rewards: {
                          ...formData.rewards,
                          points: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>

                <Button type="submit" className="w-full">
                  {editingTask ? '保存更改' : '创建任务'}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>

        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>任务名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>奖励</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                      {task.type}
                    </span>
                  </TableCell>
                  <TableCell>{task.rewards?.points || 0} 积分</TableCell>
                  <TableCell>
                    {new Date(task.updated_at).toLocaleDateString('zh-CN')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(task)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(task)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(task.id)}
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