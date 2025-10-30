'use client'
import { redirect } from 'next/navigation';
import React from 'react';
import { useAuth } from '@/components/auth/auth-provider';

interface AuthRouteProps {
  children: React.ReactNode;
}

export function AuthRoute({ children }: AuthRouteProps) {
  const { isAuthenticated, loading } = useAuth();

  // 如果正在加载认证状态，显示加载中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  // 如果未认证，重定向到登录页
  if (!isAuthenticated) {
    redirect('/login');
  }

  // 如果已认证，渲染子组件
  return (
    <>
      {children}
    </>
  );
}