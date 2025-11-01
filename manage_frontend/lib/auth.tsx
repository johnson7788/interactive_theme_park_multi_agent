'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, TokenResponse } from './api';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 使用 sessionStorage，每次打开新标签页都需要重新登录
    const token = sessionStorage.getItem('access_token');
    
    if (token) {
      setIsAuthenticated(true);
    }
    
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    // 开发模式：跳过真实验证，直接登录成功
    if (username && password) {
      const fakeToken = `dev-token-${Date.now()}`;
      sessionStorage.setItem('access_token', fakeToken);
      setIsAuthenticated(true);
    } else {
      throw new Error('请输入用户名和密码');
    }
    
    // 生产模式：取消下面的注释启用真实API验证
    // const response: TokenResponse = await apiClient.login({ username, password });
    // sessionStorage.setItem('access_token', response.access_token);
    // setIsAuthenticated(true);
  };

  const logout = () => {
    sessionStorage.removeItem('access_token');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }
  return context;
}

