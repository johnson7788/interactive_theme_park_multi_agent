import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Search } from '@/components/ui/search';
import { Bell, Settings, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { logout } from '@/lib/auth';

interface TopbarProps {
  toggleSidebar: () => void;
}

export function Topbar({ toggleSidebar }: TopbarProps) {
  const { user } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <header className="h-16 border-b bg-background sticky top-0 z-30">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:flex">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden md:block">
            <Search placeholder="搜索..." className="w-64" />
          </div>
          <div className="md:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              <Search className="h-5 w-5" />
            </Button>
            {isSearchOpen && (
              <div className="absolute top-16 left-0 right-0 p-4 bg-background border-b z-50">
                <Search placeholder="搜索..." className="w-full" />
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <DropdownMenuLabel>通知中心</DropdownMenuLabel>
                <Button variant="ghost" size="sm" className="h-8 text-xs">
                  全部标为已读
                </Button>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {[1, 2, 3].map((i) => (
                  <>
                    <DropdownMenuItem key={i} className="p-4 cursor-pointer hover:bg-accent focus:bg-accent transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary"></div>
                        <div>
                          <div className="text-sm font-medium">
                            新的故事已创建
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            刚刚创建了一个新的AI故事："森林冒险"
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            5分钟前
                          </div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </>
                ))}
              </div>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button variant="ghost" className="w-full justify-center text-sm">
                  查看所有通知
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Separator orientation="vertical" className="h-8" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 hover:bg-muted rounded-full p-1 transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar} alt={user?.name || '用户头像'} />
                  <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-block font-medium">
                  {user?.name || '管理员'}
                </span>
                <span className="hidden md:inline-block">
                  <Badge variant="outline" className="ml-2">管理员</Badge>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>我的账户</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>账户设置</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>退出登录</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}