'use client';
import React, { createContext, useState, useEffect, useContext } from 'react';
import { UserInfo, getUserInfo, isAuthenticated } from './auth';

// 定义认证上下文类型
interface AuthContextType {
  isAuthenticated: boolean;
  user: UserInfo | null;
  loading: boolean;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 认证提供者组件
interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticatedState, setIsAuthenticatedState] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化认证状态
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // 检查认证状态
  const checkAuthStatus = () => {
    setLoading(true);
    try {
      // 检查是否已认证
      const authenticated = isAuthenticated();
      setIsAuthenticatedState(authenticated);
      
      // 如果已认证，获取用户信息
      if (authenticated) {
        const userInfo = getUserInfo();
        setUser(userInfo);
      }
    } catch (error) {
      console.error('检查认证状态失败:', error);
      setIsAuthenticatedState(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    isAuthenticated: isAuthenticatedState,
    user,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading && (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      )}
      {!loading && children}
    </AuthContext.Provider>
  );
}

// 自定义Hook，用于在组件中使用认证上下文
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}