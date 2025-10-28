'use client';

import { useState, useEffect } from 'react';
import { supabase, type User } from '@/lib/supabase';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userTasks, setUserTasks] = useState<any[]>([]);
  const [userRewards, setUserRewards] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (user: User) => {
    setSelectedUser(user);

    try {
      const [tasksRes, rewardsRes] = await Promise.all([
        supabase
          .from('user_tasks')
          .select('*, task_templates(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_rewards')
          .select('*, rewards(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (rewardsRes.error) throw rewardsRes.error;

      setUserTasks(tasksRes.data || []);
      setUserRewards(rewardsRes.data || []);
    } catch (error) {
      toast.error('加载用户详情失败');
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">用户列表</h1>
        <p className="mt-2 text-muted-foreground">
          查看游客任务完成情况和积分记录
        </p>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索用户ID或名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户ID</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>当前积分</TableHead>
                <TableHead>已完成任务</TableHead>
                <TableHead>最后打卡时间</TableHead>
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
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-xs">
                      {user.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-primary">
                        {user.points}
                      </span>
                    </TableCell>
                    <TableCell>{user.completed_tasks}</TableCell>
                    <TableCell>
                      {user.last_checkin
                        ? new Date(user.last_checkin).toLocaleString('zh-CN')
                        : '未打卡'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(user)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>用户详情</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">用户名称</p>
                  <p className="text-xl font-semibold">{selectedUser.name}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">当前积分</p>
                  <p className="text-xl font-semibold text-primary">
                    {selectedUser.points}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">已完成任务</p>
                  <p className="text-xl font-semibold">
                    {selectedUser.completed_tasks}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">最后打卡</p>
                  <p className="text-sm font-semibold">
                    {selectedUser.last_checkin
                      ? new Date(selectedUser.last_checkin).toLocaleString('zh-CN')
                      : '未打卡'}
                  </p>
                </Card>
              </div>

              <Tabs defaultValue="tasks">
                <TabsList className="w-full">
                  <TabsTrigger value="tasks" className="flex-1">
                    任务履历
                  </TabsTrigger>
                  <TabsTrigger value="rewards" className="flex-1">
                    奖励记录
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="tasks" className="mt-4">
                  <div className="space-y-3">
                    {userTasks.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-8">
                        暂无任务记录
                      </p>
                    ) : (
                      userTasks.map((userTask) => (
                        <Card key={userTask.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">
                                {userTask.task_templates?.name || '未知任务'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {userTask.task_templates?.type}
                              </p>
                            </div>
                            <div className="text-right">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  userTask.status === '已完成'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {userTask.status}
                              </span>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(userTask.created_at).toLocaleDateString(
                                  'zh-CN'
                                )}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="rewards" className="mt-4">
                  <div className="space-y-3">
                    {userRewards.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-8">
                        暂无奖励记录
                      </p>
                    ) : (
                      userRewards.map((userReward) => (
                        <Card key={userReward.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">
                                {userReward.rewards?.name || '未知奖励'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {userReward.rewards?.content}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                                {userReward.rewards?.type}
                              </span>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(
                                  userReward.received_at
                                ).toLocaleDateString('zh-CN')}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
