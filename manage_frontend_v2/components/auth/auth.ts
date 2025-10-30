'use client';

// 用户信息类型
export interface UserInfo {
  id: number;
  username: string;
  email: string;
  role: string;
  // 其他用户相关信息
}

// 获取认证状态
export function isAuthenticated(): boolean {
  try {
    // 在客户端使用document.cookie
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'auth_token' && value) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('检查认证状态失败:', error);
    return false;
  }
}

// 获取用户信息
export function getUserInfo(): UserInfo | null {
  try {
    // 在客户端使用document.cookie
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'user_info') {
        // 解码并解析用户信息
        const decodedValue = decodeURIComponent(value);
        const userInfo: UserInfo = JSON.parse(decodedValue);
        return userInfo;
      }
    }
    return null;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
}

// 登录函数
export async function login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 向后端API发送登录请求
    const response = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.access_token) {
      // 登录成功，保存token和用户信息到cookie
      const secure = process.env.NODE_ENV === 'production';
      const maxAge = data.expires_in || 7200;
      
      // 在客户端设置cookie
      document.cookie = `auth_token=${data.access_token}; path=/; SameSite=strict; ${secure ? 'Secure;' : ''} max-age=${maxAge}`;
      
      // 这里简化处理，实际应该从后端返回的用户信息中提取
      const userInfo: UserInfo = {
        id: 1, // 实际应该从后端获取
        username,
        email: `${username}@example.com`, // 实际应该从后端获取
        role: 'admin', // 实际应该从后端获取
      };
      
      const encodedUserInfo = encodeURIComponent(JSON.stringify(userInfo));
      document.cookie = `user_info=${encodedUserInfo}; path=/; SameSite=strict; ${secure ? 'Secure;' : ''} max-age=${maxAge}`;
      
      return { success: true };
    } else {
      return { success: false, error: data.detail || '登录失败' };
    }
  } catch (error) {
    console.error('登录请求失败:', error);
    return { success: false, error: '网络错误，请稍后重试' };
  }
}

// 登出函数
export function logout(): void {
  try {
    // 清除认证相关的cookie
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    document.cookie = 'user_info=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
  } catch (error) {
    console.error('登出失败:', error);
  }
}