// 认证相关的API和工具函数
const AUTH_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/admin';

// 存储键名
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  USER_INFO: 'auth_user_info',
};

// 用户信息类型
export type UserInfo = {
  id: number;
  username: string;
  role: 'admin' | 'planner' | 'user';
  name?: string;
};

// 登录请求类型
export type LoginRequest = {
  username: string;
  password: string;
};

// 登录响应类型
export type LoginResponse = {
  access_token: string;
  expires_in: number;
};

/**
 * 登录函数
 * @param username 用户名
 * @param password 密码
 * @returns 登录响应
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  try {
    const response = await fetch(`${AUTH_API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`登录失败: ${response.status}`);
    }

    const data = await response.json();
    
    // 存储令牌
    if (data.access_token) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
      
      // 解析用户信息（假设令牌中包含用户信息）
      try {
        // 简单解析，实际应该根据JWT结构调整
        const userInfo = parseUserFromToken(data.access_token);
        if (userInfo) {
          localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
        }
      } catch (e) {
        console.error('解析令牌失败:', e);
      }
    }

    return data;
  } catch (error) {
    console.error('登录过程中发生错误:', error);
    throw error;
  }
}

/**
 * 从令牌中解析用户信息
 * @param token JWT令牌
 * @returns 用户信息或null
 */
function parseUserFromToken(token: string): UserInfo | null {
  try {
    // 简单的解析逻辑，实际应该根据JWT的结构进行调整
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return null;
    
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    
    return {
      id: payload.uid || 0,
      username: payload.username || '',
      role: (payload.role as 'admin' | 'planner' | 'user') || 'user',
      name: payload.name,
    };
  } catch (e) {
    console.error('解析令牌失败:', e);
    return null;
  }
}

/**
 * 获取访问令牌
 * @returns 访问令牌或null
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

/**
 * 保存访问令牌
 * @param token 访问令牌
 */
export function setAccessToken(token: string): void {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
}

/**
 * 获取用户信息
 * @returns 用户信息或null
 */
export function getUserInfo(): UserInfo | null {
  const userInfoStr = localStorage.getItem(STORAGE_KEYS.USER_INFO);
  if (!userInfoStr) return null;
  
  try {
    return JSON.parse(userInfoStr);
  } catch (e) {
    console.error('解析用户信息失败:', e);
    return null;
  }
}

/**
 * 保存用户信息
 * @param userInfo 用户信息
 */
export function setUserInfo(userInfo: UserInfo): void {
  localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
}

/**
 * 检查是否已认证
 * @returns 是否已认证
 */
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  return !!token;
}

/**
 * 登出
 */
export function logout(): void {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER_INFO);
}

/**
 * 获取认证头部
 * @returns 包含Authorization头部的对象
 */
export function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
    };
  }
  return {};
}