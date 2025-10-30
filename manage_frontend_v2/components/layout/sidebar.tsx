import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Logo } from '@/components/ui/logo';
import { NavLink } from '@/components/ui/nav-link';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart3,
  ChevronDown,
  Settings,
  Users,
  Zap,
  MenuSquare,
  Lightbulb,
  LayoutGrid,
  MessageSquare,
  PlayCircle,
  X,
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
}

export function Sidebar({ open }: SidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 导航项类型定义
  interface NavItem {
    title: string;
    icon: React.ReactNode;
    href: string;
    badge?: string;
    submenu?: Array<{
      title: string;
      href: string;
    }>;
  }

  // 导航菜单数据
  const navItems: NavItem[] = [
    {
      title: '控制面板',
      icon: <LayoutGrid className="h-5 w-5" />,
      href: '/dashboard',
    },
    {
      title: 'AI故事管理',
      icon: <MessageSquare className="h-5 w-5" />,
      href: '/stories',
    },
    {
      title: '游戏主题管理',
      icon: <MenuSquare className="h-5 w-5" />,
      href: '/themes',
    },
    {
      title: 'AI角色管理',
      icon: <Users className="h-5 w-5" />,
      href: '/characters',
    },
    {
      title: '场景设计',
      icon: <Lightbulb className="h-5 w-5" />,
      href: '/scenes',
    },
    {
      title: '故事线配置',
      icon: <PlayCircle className="h-5 w-5" />,
      href: '/storylines',
    },
    {
      title: '数据分析',
      icon: <BarChart3 className="h-5 w-5" />,
      href: '/analytics',
    },
    {
      title: '系统设置',
      icon: <Settings className="h-5 w-5" />,
      href: '/settings',
    },
  ];

  // 渲染导航项
  const renderNavItem = (item: NavItem, isMobile = false) => {
    const baseClasses = isMobile
      ? 'w-full justify-start'
      : 'w-full justify-start';
    
    return (
      <NavLink
        key={item.href}
        href={item.href}
        className={baseClasses}
      >
        <div className="flex items-center gap-2">
          {item.icon}
          <span className="font-medium">{item.title}</span>
          {item.badge && (
            <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
              {item.badge}
            </span>
          )}
        </div>
      </NavLink>
    );
  };

  // 桌面侧边栏
  const DesktopSidebar = () => (
    <aside className={`
      fixed top-0 left-0 z-40 h-full border-r bg-background 
      transition-all duration-300 ease-in-out
      ${open ? 'w-64' : 'w-20'}
    `}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <div className={`transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
            <Logo className="h-8" />
          </div>
          {!open && (
            <Logo className="h-8 ml-2" />
          )}
        </div>
        <ScrollArea className="flex-1 py-4 px-2">
          <nav className="space-y-1">
            {navItems.map((item) => renderNavItem(item))}
          </nav>
        </ScrollArea>
        <div className="p-4 border-t">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className={`text-sm font-medium transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                  阿派朗主题乐园
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </aside>
  );

  // 移动侧边栏
  const MobileSidebar = () => (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetContent side="left" className="p-0 w-64">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <Logo className="h-8" />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <ScrollArea className="flex-1 py-4 px-2">
            <nav className="space-y-1">
              {navItems.map((item) => renderNavItem(item, true))}
            </nav>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <>
      <div className="md:hidden">
        <MobileSidebar />
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-background border shadow-lg"
          onClick={() => setMobileMenuOpen(true)}
        >
          <MenuSquare className="h-5 w-5" />
        </Button>
      </div>
      <div className="hidden md:block">
        <DesktopSidebar />
      </div>
    </>
  );
}