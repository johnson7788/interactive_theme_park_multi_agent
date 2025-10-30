// API 客户端，用于与 manage_backend 通信

import { getAuthHeaders, logout } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/admin';

// 通用的请求函数
async function request<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  headers?: HeadersInit,
  withAuth = true
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(withAuth ? getAuthHeaders() : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (response.status === 401) {
      // 未授权，可能是令牌过期，触发登出
      logout();
      // 重定向到登录页面
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('未授权，请重新登录');
    }

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`请求 ${url} 失败:`, error);
    throw error;
  }
}

// 类型定义
export type GameTheme = {
  id: number;
  name: string;
  description: string;
  scene_count: number;
  status: string;
  created_at: string;
  updated_at: string;
  npc_count?: number;
};

export type NPCCharacter = {
  id: number;
  name: string;
  game_theme_id: number;
  avatar_url: string;
  personality: string;
  dialogue_template: any;
  created_at: string;
  updated_at: string;
};

export type TaskTemplate = {
  id: number;
  name: string;
  type: string;
  game_theme_id: number;
  rewards: any;
  trigger_conditions: any;
  content: string;
  created_at: string;
  updated_at: string;
};

export type Checkpoint = {
  id: number;
  name: string;
  area: string;
  position_x: number;
  position_y: number;
  npc_id: number;
  event_config: any;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  name: string;
  points: number;
  completed_tasks: number;
  last_checkin: string;
  created_at: string;
  updated_at: string;
};

export type Reward = {
  id: number;
  name: string;
  type: string;
  conditions: any;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
};

// 故事相关类型
export type Story = {
  id: number;
  title: string;
  content: string;
  game_theme_id: number | null;
  generated_tasks: any[];
  created_at: string;
  updated_at: string;
};

export type Page<T> = {
  data: T[];
  meta: {
    page: number;
    size: number;
    total: number;
  };
};

// API 方法导出
export const api = {
  // 主题相关
  themes: {
    getAll: (q?: string, page = 1, size = 20) => {
      const queryParams = new URLSearchParams();
      if (q) queryParams.append('q', q);
      queryParams.append('page', page.toString());
      queryParams.append('size', size.toString());
      return request<Page<GameTheme>>(`/themes?${queryParams}`);
    },
    getById: (id: number) => request<GameTheme>(`/themes/${id}`),
    create: (data: Omit<GameTheme, 'id' | 'created_at' | 'updated_at'>) => 
      request<GameTheme>('/themes', 'POST', data),
    update: (id: number, data: Partial<Omit<GameTheme, 'id' | 'created_at'>>) => 
      request<GameTheme>(`/themes/${id}`, 'PUT', data),
    delete: (id: number) => request<{ ok: boolean }>(`/themes/${id}`, 'DELETE'),
  },

  // 统计数据相关
  stats: {
    getDashboardStats: async () => {
      try {
        // 并行获取所有需要的数据
        const [users, tasks, rewards, checkpoints, themes] = await Promise.all([
          api.users.getAll(),
          api.tasks.getAll(),
          api.rewards.getAll(),
          api.checkpoints.getAll(),
          api.themes.getAll()
        ]);
        
        // 计算场景总数
        const totalScenes = themes.data.reduce((sum, theme) => sum + theme.scene_count, 0);
        
        // 生成模拟的用户活动数据
        const generateActivityData = () => {
          const data = [];
          const today = new Date();
          
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            data.push({
              date: date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
              active: Math.floor(Math.random() * 100) + 20
            });
          }
          
          return data;
        };
        
        // 生成模拟的主题人气数据
        const generateThemePopularity = () => {
          return themes.data.slice(0, 5).map(theme => ({
            name: theme.name,
            users: Math.floor(Math.random() * 500) + 100
          }));
        };
        
        return {
          data: {
            totalUsers: users.data.length,
            totalTasks: tasks.length,
            totalRewards: rewards.length,
            totalCheckpoints: checkpoints.length,
            totalThemes: themes.data.length,
            totalScenes,
            userActivity: generateActivityData(),
            themePopularity: generateThemePopularity()
          }
        };
      } catch (error) {
        console.error('获取仪表盘统计数据失败:', error);
        // 提供默认值以避免页面崩溃
        return {
          data: {
            totalUsers: 0,
            totalTasks: 0,
            totalRewards: 0,
            totalCheckpoints: 0,
            totalThemes: 0,
            totalScenes: 0,
            userActivity: [],
            themePopularity: []
          }
        };
      }
    }
  },

  // NPC 相关
  npcs: {
    getAll: () => request<NPCCharacter[]>('/npcs'),
    getById: (id: number) => request<NPCCharacter>(`/npcs/${id}`),
    create: (data: Omit<NPCCharacter, 'id' | 'created_at' | 'updated_at'>) => 
      request<NPCCharacter>('/npcs', 'POST', data),
    update: (id: number, data: Partial<Omit<NPCCharacter, 'id' | 'created_at'>>) => 
      request<NPCCharacter>(`/npcs/${id}`, 'PUT', data),
    delete: (id: number) => request<{ ok: boolean }>(`/npcs/${id}`, 'DELETE'),
  },

  // 任务相关
  tasks: {
    getAll: () => request<TaskTemplate[]>('/tasks'),
    getById: (id: number) => request<TaskTemplate>(`/tasks/${id}`),
    create: (data: Omit<TaskTemplate, 'id' | 'created_at' | 'updated_at'>) => 
      request<TaskTemplate>('/tasks', 'POST', data),
    update: (id: number, data: Partial<Omit<TaskTemplate, 'id' | 'created_at'>>) => 
      request<TaskTemplate>(`/tasks/${id}`, 'PUT', data),
    delete: (id: number) => request<{ ok: boolean }>(`/tasks/${id}`, 'DELETE'),
  },

  // 检查点相关
  checkpoints: {
    getAll: () => request<Checkpoint[]>('/checkpoints'),
    getById: (id: number) => request<Checkpoint>(`/checkpoints/${id}`),
    create: (data: Omit<Checkpoint, 'id' | 'created_at' | 'updated_at'>) => 
      request<Checkpoint>('/checkpoints', 'POST', data),
    update: (id: number, data: Partial<Omit<Checkpoint, 'id' | 'created_at'>>) => 
      request<Checkpoint>(`/checkpoints/${id}`, 'PUT', data),
    delete: (id: number) => request<{ ok: boolean }>(`/checkpoints/${id}`, 'DELETE'),
  },

  // 用户相关
  users: {
    getAll: (q?: string, page = 1, size = 20) => {
      const queryParams = new URLSearchParams();
      if (q) queryParams.append('q', q);
      queryParams.append('page', page.toString());
      queryParams.append('size', size.toString());
      return request<Page<User>>(`/users?${queryParams}`);
    },
    getById: (id: string) => request<User>(`/users/${id}`),
    getUserTasks: (userId: string) => request<Page<any>>(`/users/${userId}/tasks`),
    getUserRewards: (userId: string) => request<Page<any>>(`/users/${userId}/rewards`),
  },

  // 奖励相关
  rewards: {
    getAll: () => request<Reward[]>('/rewards'),
    getById: (id: number) => request<Reward>(`/rewards/${id}`),
    create: (data: Omit<Reward, 'id' | 'created_at' | 'updated_at'>) => 
      request<Reward>('/rewards', 'POST', data),
    update: (id: number, data: Partial<Omit<Reward, 'id' | 'created_at'>>) => 
      request<Reward>(`/rewards/${id}`, 'PUT', data),
    delete: (id: number) => request<{ ok: boolean }>(`/rewards/${id}`, 'DELETE'),
  },

  // 故事相关
  stories: {
    getAll: () => request<Story[]>('/stories'),
    getById: (id: number) => request<Story>(`/stories/${id}`),
    create: (data: Omit<Story, 'id' | 'created_at' | 'updated_at'>) => 
      request<Story>('/stories', 'POST', data),
    update: (id: number, data: Partial<Omit<Story, 'id' | 'created_at'>>) => 
      request<Story>(`/stories/${id}`, 'PUT', data),
    delete: (id: number) => request<{ ok: boolean }>(`/stories/${id}`, 'DELETE'),
  },
};