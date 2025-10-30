import { MainLayout } from '@/components/layout/main-layout';
import { AuthRoute } from '@/components/auth/auth-route';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthRoute>
      <MainLayout>
        {children}
      </MainLayout>
    </AuthRoute>
  );
}