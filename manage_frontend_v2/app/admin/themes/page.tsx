'use client';

import { useState, useEffect } from 'react';
import { api, type GameTheme } from '@/lib/api';
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
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ThemesPage() {
  const [themes, setThemes] = useState<GameTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<GameTheme | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scene_count: 0,
    status: '草稿',
  });

  useEffect(() => {
    fetchThemes();
  }, []);

  const fetchThemes = async () => {
    try {
      const response = await api.themes.getAll(searchTerm);
      setThemes(response.data);
    } catch (error) {
      toast.error('加载游戏主题失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTheme) {
        await api.themes.update(editingTheme.id, formData);
        toast.success('游戏主题更新成功');
      } else {
        await api.themes.create(formData);
        toast.success('游戏主题创建成功');
      }

      setIsOpen(false);
      resetForm();
      fetchThemes();
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleEdit = (theme: GameTheme) => {
    setEditingTheme(theme);
    setFormData({
      name: theme.name,
      description: theme.description,
      scene_count: theme.scene_count,
      status: theme.status,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个游戏主题吗？')) return;

    try {
      await api.themes.delete(id);
      toast.success('删除成功');
      fetchThemes();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      scene_count: 0,
      status: '草稿',
    });
    setEditingTheme(null);
  };

  const filteredThemes = themes.filter((theme) =>
    theme.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">游戏主题管理</h1>
        <p className="mt-2 text-muted-foreground">
          创建和管理游戏主题、场景及配置
        </p>
      </div>

      <Card className="p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索游戏主题..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Sheet open={isOpen} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                新建主题
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[500px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>
                  {editingTheme ? '编辑游戏主题' : '新建游戏主题'}
                </SheetTitle>
              </SheetHeader>

              <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">游戏名称</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="输入游戏名称"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">游戏描述</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="输入游戏描述"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scene_count">场景数量</Label>
                  <Input
                    id="scene_count"
                    type="number"
                    min="0"
                    value={formData.scene_count}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        scene_count: parseInt(e.target.value) || 0,
                      })
                    }
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
                      <SelectItem value="草稿">草稿</SelectItem>
                      <SelectItem value="进行中">进行中</SelectItem>
                      <SelectItem value="已完成">已完成</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full">
                  {editingTheme ? '保存更改' : '创建主题'}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>

        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>游戏名</TableHead>
                <TableHead>场景数</TableHead>
                <TableHead>状态</TableHead>
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
              ) : filteredThemes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                filteredThemes.map((theme) => (
                  <TableRow key={theme.id}>
                    <TableCell className="font-medium">{theme.name}</TableCell>
              <TableCell>{theme.scene_count}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${theme.status === '进行中' ? 'bg-green-100 text-green-800' : theme.status === '已完成' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                >
                  {theme.status}
                </span>
              </TableCell>
              <TableCell>
                {new Date(theme.updated_at).toLocaleDateString('zh-CN')}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(theme)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(theme.id)}
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