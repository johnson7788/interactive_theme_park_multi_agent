'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Gamepad2,
  Users,
  Puzzle,
  Gift,
  BarChart3,
  Settings,
  Sparkles,
  MapPin,
} from 'lucide-react';

const navigation = [
  {
    title: '游戏与故事管理',
    items: [
      { name: '游戏主题管理', href: '/admin/themes', icon: Gamepad2 },
      { name: 'NPC角色管理', href: '/admin/npcs', icon: Users },
      { name: '故事生成', href: '/admin/stories', icon: Sparkles },
    ],
  },
  {
    title: '任务与打卡管理',
    items: [
      { name: '任务模板管理', href: '/admin/tasks', icon: Puzzle },
      { name: '打卡点配置', href: '/admin/checkpoints', icon: MapPin },
    ],
  },
  {
    title: '用户与奖励',
    items: [
      { name: '用户列表', href: '/admin/users', icon: Users },
      { name: '奖励设置', href: '/admin/rewards', icon: Gift },
    ],
  },
  {
    title: '数据中心',
    items: [
      { name: '数据概览', href: '/admin/dashboard', icon: BarChart3 },
    ],
  },
  {
    title: '系统设置',
    items: [
      { name: '系统配置', href: '/admin/settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Gamepad2 className="h-8 w-8 text-primary" />
        <h1 className="ml-3 text-xl font-bold text-foreground">
          阿派朗乐园
        </h1>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {navigation.map((section) => (
          <div key={section.title}>
            <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </h2>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
