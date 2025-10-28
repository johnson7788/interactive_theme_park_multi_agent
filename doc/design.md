# 🎢 阿派朗创造力乐园系统 —— 前后端开发需求文档

## 一、系统概述

该系统是一个面向儿童的沉浸式乐园互动系统。通过AI Agent与用户（小朋友）对话，结合手环打卡设备与任务奖励机制，为每位游客生成独特的游戏体验与故事线。

系统分为三大部分：

1. **管理后台（Admin UI）**：管理员可创建游戏主题、角色、任务、故事线、奖品等。
2. **用户交互前端（Next.js）**：游客在打卡点与NPC（Agent）互动的可视化界面。
3. **后端（Python + Agent系统）**：负责任务逻辑、AI对话生成、用户状态与奖励管理。

---

## 二、系统架构

### 前端

* 技术栈：`Next.js 14`、`TypeScript`、`TailwindCSS`、`SWR`、`Next API Routes`
* 功能模块：

  * 管理后台（Admin Panel）
  * 用户交互界面（Chat-like NPC对话UI）
  * 手环打卡触发界面（扫码/感应后展示Agent内容）
  * 多Agent头像与状态切换区
  * 奖励与任务进度展示模块

### 后端

* 技术栈：`Python 3.11`、`FastAPI`、`SQLAlchemy`、`PostgreSQL`、`LangChain` / 自研Agent框架
* 功能模块：

  * Agent任务与故事生成模块
  * 用户状态管理
  * 打卡与任务记录接口
  * 奖励与积分计算
  * 聊天记录与AI回复缓存
  * 多Agent分发与管理（支持多个站点、多个角色）

---

## 三、核心流程

### 1. 后台流程（管理员）

1. 管理员进入管理后台。
2. 创建“游戏主题” → “NPC角色” → “任务模板”。
3. 后端调用AI生成对应故事背景、对话模板、任务参数。
4. 管理员可微调、发布。
5. 系统自动为各个Agent生成任务池与参数。

### 2. 用户互动流程

1. 用户首次入园 → 手环绑定账号 → 生成专属多角色Agent实例。
2. 用户到达某打卡点 → 感应设备读取手环ID。
3. 前端调用后端 `/agent/interact` 接口：

   * 输入参数：

     * 用户ID、打卡点ID、时间、角色信息、前序任务记录
   * 后端输出：

     * 对话内容（NPC台词）
     * 奖励或任务信息
4. 前端展示NPC头像 + 对话气泡，支持语音播报（TTS）。
5. 用户完成任务后，系统更新状态并引导下一个任务。

---

## 四、前后端接口设计

### 1. 用户打卡交互

**Endpoint**：`POST /api/agent/interact`

**Request Body：**

```json
{
  "user_id": "USER123",
  "checkpoint_id": "CP001",
  "timestamp": "2025-10-12T10:30:00",
  "game_id": "GAME01",
  "role": "default"
}
```

**Response：**

```json
{
  "agent_id": "AGENT_KAKA_001",
  "npc_name": "小河狸咔咔",
  "dialog": [
    {"speaker": "npc", "text": "你好，欢迎来到阿派朗创造力乐园！你是第一次来呀？"},
    {"speaker": "user", "text": "是的！"},
    {"speaker": "npc", "text": "完成探秘任务就有特别奖励哦！"}
  ],
  "reward": {
    "type": "energy",
    "value": 5,
    "description": "你获得了5点星能"
  },
  "next_hint": "前往科学小游戏区域继续探险！"
}
```

---

### 2. Agent故事管理

**Endpoint**：`POST /api/admin/agent/generate`

**功能**：AI生成Agent故事背景与任务模板。

**Request Body：**

```json
{
  "theme": "星际探险",
  "npc_name": "咔咔",
  "locations": ["科学岛", "机械森林"],
  "task_types": ["问答", "采集", "导流"]
}
```

**Response：**

```json
{
  "npc_story": "在遥远的星际世界，小河狸咔咔是科学探险队的队长...",
  "tasks": [
    {"type": "问答", "example": "请问AI是什么？"},
    {"type": "导流", "example": "去机械森林完成任务吧！"}
  ]
}
```

---

### 3. 用户任务记录接口

**Endpoint**：`GET /api/user/progress/{user_id}`

**Response：**

```json
{
  "user_id": "USER123",
  "current_tasks": [
    {"task_id": "T001", "status": "completed"},
    {"task_id": "T002", "status": "in_progress"}
  ],
  "total_points": 15,
  "rewards": ["阿派朗徽章", "星能+10"]
}
```

---

## 五、前端设计要点

### 1. 管理后台（Next.js）

* 页面结构：

  * 登录页（管理员）
  * 角色与任务管理页
  * Agent AI故事生成页
  * 打卡点配置页
* 组件：

  * 表格 + 表单组件（可编辑）
  * AI生成按钮（调用后端生成任务模板）
  * 数据可视化模块（任务完成统计、积分榜）

### 2. 用户交互UI（Next.js）

* 触发方式：

  * 手环感应 → 自动进入交互页
* 页面结构：

  * NPC头像 + 聊天气泡式UI
  * 奖励浮层动画（获得星能、徽章等）
  * “下一步去哪儿”指引箭头
* 技术实现：

  * Chat组件复用WebSocket/SWR实时更新
  * 支持文字 + TTS语音播报
  * 支持切换NPC（多Agent）

---

## 六、数据模型（简要）

### 用户表 `users`

| 字段      | 类型     | 说明     |
| ------- | ------ | ------ |
| user_id | string | 用户唯一标识 |
| name    | string | 名称（可选） |
| role    | string | 当前角色   |
| points  | int    | 当前积分   |
| rewards | json   | 奖励记录   |

### Agent表 `agents`

| 字段            | 类型     | 说明           |
| ------------- | ------ | ------------ |
| agent_id      | string | 唯一ID         |
| npc_name      | string | 名称           |
| story         | text   | 背景故事         |
| current_tasks | json   | 当前任务池        |
| metadata      | json   | 管理参数（地点、时间等） |

### 打卡记录 `checkpoints`

| 字段            | 类型     | 说明           |
| ------------- | ------ | ------------ |
| checkpoint_id | string | 打卡点ID        |
| location      | string | 所在位置         |
| base_event    | string | 触发类型（问答、采集等） |

---

## 七、AI Agent逻辑（后端）

1. **初始化阶段**：根据主题自动生成故事与任务。
2. **打卡触发**：根据参数生成对话、奖励内容。
3. **状态追踪**：记录用户行为、任务完成情况。
4. **智能推荐**：基于任务历史，引导用户前往下一个站点。
5. **多Agent协作**：通过metadata共享任务信息，实现跨站点剧情衔接。

---

## 八、后续扩展

* ✅ 微信小程序嵌入模式（用户端）
* ✅ 增加语音识别（ASR）模块
* ✅ 增加家长端任务记录页
* ✅ Agent任务模板可视化编排（流程图形式）

---