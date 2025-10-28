'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Users, Puzzle, Gift, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTasks: 0,
    totalRewards: 0,
    totalCheckpoints: 0,
  });
  const [taskCompletionData, setTaskCompletionData] = useState<any[]>([]);
  const [taskTypeData, setTaskTypeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [usersRes, tasksRes, rewardsRes, checkpointsRes, taskTemplatesRes] =
        await Promise.all([
          supabase.from('users').select('id', { count: 'exact', head: true }),
          supabase
            .from('user_tasks')
            .select('id', { count: 'exact', head: true }),
          supabase.from('rewards').select('id', { count: 'exact', head: true }),
          supabase
            .from('checkpoints')
            .select('id', { count: 'exact', head: true }),
          supabase.from('task_templates').select('type'),
        ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalTasks: tasksRes.count || 0,
        totalRewards: rewardsRes.count || 0,
        totalCheckpoints: checkpointsRes.count || 0,
      });

      const mockCompletionData = [
        { date: '10-08', completed: 45, total: 60 },
        { date: '10-09', completed: 62, total: 80 },
        { date: '10-10', completed: 78, total: 95 },
        { date: '10-11', completed: 88, total: 110 },
        { date: '10-12', completed: 102, total: 125 },
      ];
      setTaskCompletionData(mockCompletionData);

      const taskTypes = taskTemplatesRes.data || [];
      const typeCounts = taskTypes.reduce((acc: any, task: any) => {
        acc[task.type] = (acc[task.type] || 0) + 1;
        return acc;
      }, {});

      const typeData = Object.entries(typeCounts).map(([name, value]) => ({
        name,
        value,
      }));
      setTaskTypeData(typeData);
    } catch (error) {
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#2E90FA', '#FFCD4B', '#10B981', '#8B5CF6'];

  const statCards = [
    {
      title: '总用户数',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: '任务总数',
      value: stats.totalTasks,
      icon: Puzzle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: '奖励总数',
      value: stats.totalRewards,
      icon: Gift,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: '打卡点数',
      value: stats.totalCheckpoints,
      icon: MapPin,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">数据中心</h1>
        <p className="mt-2 text-muted-foreground">
          查看系统数据概览和统计分析
        </p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="mt-2 text-3xl font-bold">{stat.value}</p>
                </div>
                <div className={`rounded-xl p-3 ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="mb-6 text-xl font-semibold">任务完成趋势</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={taskCompletionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#2E90FA"
                strokeWidth={2}
                name="已完成"
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#FFCD4B"
                strokeWidth={2}
                name="总任务"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="mb-6 text-xl font-semibold">任务类型分布</h2>
          <ResponsiveContainer width="100%" height={300}>
            {taskTypeData.length > 0 ? (
              <PieChart>
                <Pie
                  data={taskTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {taskTypeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">暂无数据</p>
              </div>
            )}
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-6 text-xl font-semibold">打卡点活跃度</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={[
              { name: 'A区入口', visits: 120 },
              { name: 'B区游乐场', visits: 98 },
              { name: 'C区餐厅', visits: 145 },
              { name: 'D区纪念品店', visits: 67 },
              { name: 'E区表演区', visits: 88 },
            ]}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="visits" fill="#2E90FA" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
