# 阿派朗创造力乐园 - 管理后台

## 功能特点

- 🎮 游戏主题管理
- 👤 NPC角色配置
- 📝 AI故事生成
- ✅ 任务模板管理
- 📍 打卡点配置
- 👥 用户管理
- 🎁 奖励设置
- 📊 数据统计
- 🔐 用户登录认证

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，配置后端API地址：

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 运行开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 登录说明

默认管理员账号需要在后端数据库中创建。

访问系统时会自动跳转到登录页面 `/login`。

登录成功后会跳转到管理后台 `/admin/dashboard`。

## 技术栈

- **框架**: Next.js 13
- **UI组件**: Radix UI + Tailwind CSS
- **状态管理**: React Context
- **HTTP客户端**: Fetch API
- **认证**: JWT Token

## 项目结构

```
manage_frontend/
├── app/                    # Next.js 应用路由
│   ├── admin/             # 管理后台页面
│   ├── login/             # 登录页面
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 首页
├── components/            # 组件
│   ├── admin/            # 管理后台组件
│   ├── auth/             # 认证相关组件
│   └── ui/               # UI基础组件
└── lib/                  # 工具库
    ├── api.ts            # API客户端
    ├── auth.ts           # 认证逻辑
    └── utils.ts          # 工具函数
```

## API集成

前端通过 `lib/api.ts` 中的 `apiClient` 与后端通信。

所有API请求会自动携带JWT Token，Token过期时自动跳转到登录页。

## 开发说明

### 添加新页面

1. 在 `app/admin/` 下创建新目录和 `page.tsx`
2. 在 `components/admin/sidebar.tsx` 中添加导航链接

### 调用API

```typescript
import { apiClient } from '@/lib/api';

// GET请求
const data = await apiClient.get('/themes');

// POST请求
const result = await apiClient.post('/themes', { name: '新主题' });

// PUT请求
await apiClient.put('/themes/1', { name: '更新主题' });

// DELETE请求
await apiClient.delete('/themes/1');
```

## 构建生产版本

```bash
npm run build
npm run start
```
