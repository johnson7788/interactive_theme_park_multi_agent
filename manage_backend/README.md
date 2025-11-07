# 阿派朗创造力乐园 - 管理后台 API

基于 FastAPI 的后端服务，提供游戏主题、NPC、任务、打卡点等管理功能。

## 初始化

```bash
python -m venv .venv
source .venv/bin/activate  # Windows 用 .venv\Scripts\activate
pip install -r requirements.txt
cp env_example .env
uvicorn app.main:app --reload
# 初始化数据
python -m app.seeds.seed
```

## 代码逻辑

### 应用启动流程

1. **入口文件** (`app/main.py`)：
   - 创建 FastAPI 应用实例
   - 配置 CORS 中间件（允许跨域请求）
   - 挂载静态文件目录（上传文件）
   - 注册所有路由模块
   - 启动时自动创建数据库表
   - 添加审计日志中间件（记录写操作）

2. **配置管理** (`app/config.py`)：
   - 使用 Pydantic Settings 从环境变量读取配置
   - 包含数据库连接、JWT 密钥、AI 配置等

### 认证机制

1. **登录流程** (`app/routers/auth.py`)：
   - 接收用户名密码 → 查询数据库验证 → 生成 JWT Token → 返回给前端

2. **Token 验证** (`app/deps.py`)：
   - `get_current_user`：从请求头提取 Token，验证并获取用户信息
   - `get_current_admin`：验证用户是否为管理员角色
   - `require_roles`：角色权限检查工厂函数

3. **安全工具** (`app/utils/security.py`)：
   - 密码加密：使用 bcrypt 哈希密码
   - JWT 生成：创建包含用户 ID 和过期时间的 Token
   - Token 验证：解析并验证 Token 有效性

### 数据库架构

**ORM 模型** (`app/models.py`)：
- 使用 SQLAlchemy 异步 ORM
- 主要数据表：
  - `admin_users`：后台管理员账号
  - `players`：游客/玩家
  - `game_themes`：游戏主题
  - `npcs`：NPC 角色
  - `task_templates`：任务模板
  - `checkpoints`：打卡点
  - `user_task_progress`：用户任务进度
  - `reward_rules`：奖励规则
  - `user_rewards`：用户奖励记录
  - `settings`：系统配置
  - `audit_logs`：操作审计日志

**数据库连接** (`app/db.py`)：
- 使用异步 SQLAlchemy 引擎
- 提供 `get_session` 依赖注入函数，自动管理会话生命周期

### 路由结构

所有 API 路由统一前缀：`/api/admin`

**主要路由模块**：
- `auth`：登录认证
- `themes`：游戏主题管理（增删改查、分页搜索）
- `npcs`：NPC 角色管理
- `tasks`：任务模板管理
- `checkpoints`：打卡点配置
- `users`：用户管理
- `rewards`：奖励规则管理
- `stats`：数据统计
- `settings`：系统配置
- `uploads`：文件上传
- `agent`：AI 故事生成

**路由特点**：
- 使用依赖注入获取数据库会话
- 通过 `get_current_admin` 保护需要管理员权限的接口
- 统一的分页响应格式（`Page` 模型）

### 数据验证与序列化

**Pydantic Schemas** (`app/schemas.py`)：
- `*Create`：创建请求的数据模型
- `*Update`：更新请求的数据模型（字段可选）
- `*Out`：响应输出的数据模型
- 自动进行数据验证和类型转换

### 中间件机制

**审计日志中间件** (`app/main.py`)：
- 拦截所有写操作（POST、PUT、DELETE）
- 从 Token 中解析操作者 ID
- 记录操作类型、资源路径、IP 地址等信息
- 审计失败不影响主业务流程

### AI 服务

**故事生成** (`app/services/ai.py`)：
- 当前使用本地模板生成故事和任务（无需外网）
- 预留 OpenAI 接口（需配置 API Key）
- 生成的故事和任务模板供前端预览，确认后保存

### 依赖注入系统

FastAPI 的依赖注入用于：
- 数据库会话管理：`get_session`
- 用户认证：`get_current_user`、`get_current_admin`
- 自动处理会话开启/关闭、错误处理

### 文件上传

- 上传目录通过环境变量配置
- 静态文件服务挂载在 `/uploads` 路径
- 支持文件上传接口（`routers/uploads.py`）

## 技术栈

- **框架**：FastAPI
- **数据库**：MySQL（异步 SQLAlchemy）
- **认证**：JWT Token
- **密码加密**：bcrypt
- **数据验证**：Pydantic
- **配置管理**：Pydantic Settings

