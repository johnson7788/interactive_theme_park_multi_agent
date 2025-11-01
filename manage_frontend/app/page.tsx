'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.push('/admin/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [router, isAuthenticated, loading]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-muted-foreground">加载中...</div>
    </div>
  );
}
