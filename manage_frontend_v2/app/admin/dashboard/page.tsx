'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { CardContent } from '@/components/ui/card';
import { CardHeader } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { Users, Gamepad2, Award, BookOpen } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTasks: 0,
    totalRewards: 0,
    totalCheckpoints: 0,
    totalThemes: 0,
    totalScenes: 0,
    userActivity: [],
    themePopularity: [],
  });
  const [taskCompletionData, setTaskCompletionData] = useState<any[]>([]);
  const [taskTypeData, setTaskTypeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.stats.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#2E90FA', '#FFCD4B', '#10B981', '#8B5CF6'];

  const statCards = [
    {
      title: '用户总数',
      description: '活跃用户数量',
      value: stats.totalUsers,
      icon: Users,
    },
    {
      title: '主题总数',
      description: '游戏主题数量',
      value: stats.totalThemes || 0,
      icon: Gamepad2,
    },
    {
      title: '场景总数',
      description: '游戏场景数量',
      value: stats.totalScenes || 0,
      icon: BookOpen,
    },
    {
      title: '奖励总数',
      description: '可用奖励数量',
      value: stats.totalRewards,
      icon: Award,
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
            <Card key={stat.title}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {stat.title}
                </CardTitle>
                <CardDescription>{stat.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="activity">用户活动</TabsTrigger>
          <TabsTrigger value="popularity">主题人气</TabsTrigger>
        </TabsList>
        
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>用户活动趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stats.userActivity || []}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="active" stroke="#8884d8" fill="#8884d8" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="popularity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>主题人气排行</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.themePopularity || []}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="users" name="参与人数" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}