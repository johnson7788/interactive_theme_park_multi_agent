# 阿派朗创造力乐园 - 游客交互前端

面向儿童（4~10岁）的乐园互动前端应用，通过 WebSocket 与后端语音助手服务连接，实现与 NPC 的语音对话、任务完成、奖励获取等功能。

## 项目状态

**当前状态**：开发中

本项目计划基于 Next.js + TypeScript + TailwindCSS 构建，目前处于规划阶段。

## 预期功能

### 核心功能

1. **打卡识别界面**
   - 手环识别成功后显示欢迎动画
   - 自动加载对应 NPC 和用户信息
   - 3 秒倒计时后自动进入对话界面

2. **NPC 对话界面**
   - 实时语音对话（WebSocket 连接）
   - 对话气泡展示（NPC 蓝色、用户黄色）
   - 语音播放动画（NPC 头像发光、音波律动）
   - 支持语音输入和文字输入

3. **任务与奖励展示**
   - 任务卡片展示（进行中/已完成/未解锁）
   - 任务完成后的奖励动画
   - 积分和星能值显示

4. **下一步引导**
   - 地图简图显示下一个打卡点
   - 方向箭头指引
   - NPC 语音提示

## 代码逻辑架构（预期）

### 应用启动流程

1. **入口页面** (`app/page.tsx`)：
   - 检测设备 ID（从环境变量或 URL 参数）
   - 通过 OTA 接口获取 WebSocket 地址
   - 初始化 WebSocket 连接
   - 加载 NPC 信息和用户信息

2. **连接建立**：
   - 调用 OTA 接口获取配置（`/xiaozhi/ota/`）
   - 建立 WebSocket 连接（携带 device-id、client-id、token）
   - 发送 `hello` 消息初始化会话

### 语音处理流程

**参考实现**（基于 `xiaozhi_web` 项目）：

1. **音频采集**：
   - 使用浏览器 `MediaRecorder` API 或 `getUserMedia`
   - 音频格式：Opus 编码（16kHz，单声道）
   - 分帧发送（60ms 一帧）

2. **VAD 检测**（语音活动检测）：
   - 使用 `@ricky0123/vad-web` 或 `onnxruntime-web` 运行 Silero VAD 模型
   - 检测到语音开始 → 开始录音
   - 检测到语音结束 → 停止录音并发送音频

3. **音频发送**：
   - 将音频数据编码为 Opus 格式
   - 通过 WebSocket 发送二进制音频数据
   - 实时流式传输

4. **音频接收与播放**：
   - 接收服务器返回的 TTS 音频流
   - 解码 Opus 音频
   - 使用 `AudioContext` 播放音频
   - 同步显示对话文字

### 消息处理系统

**WebSocket 消息类型**：

- `hello`：连接初始化，返回 session_id
- `stt`：语音识别结果（文字）
- `llm`：大语言模型生成的回复文字
- `tts`：语音合成状态（start/sentence_start/sentence_end/stop）
- `mcp`：工具调用结果
- `abort`：中断当前操作

**消息处理流程**：

1. 接收 WebSocket 消息（JSON 或二进制）
2. 根据消息类型分发到对应处理器
3. 更新 UI 状态（对话气泡、任务状态等）
4. 触发相应动画效果

### 状态管理

**主要状态**：

- **连接状态**：未连接 / 连接中 / 已连接 / 错误
- **设备状态**：空闲 / 录音中 / 播放中 / 处理中
- **对话历史**：消息列表（用户/NPC）
- **任务状态**：当前任务列表、完成状态
- **用户信息**：用户 ID、积分、星能值
- **NPC 信息**：NPC ID、头像、名称

**状态管理方案**：

- 使用 React Hooks（`useState`、`useReducer`）
- 全局状态通过 Context API 管理
- 对话历史持久化到 Supabase

### 数据获取

**Supabase 集成**：

- 获取 NPC 信息：`getCurrentDeviceNPC()`
- 获取用户信息：`getUserById()` / `getUserByName()`
- 保存对话记录：`saveCompleteDialogue()`
- 加载对话历史：`getDialogueHistory()`

**WebSocket 通信**：

- 实时音频流传输
- 文本消息交互
- 状态同步

### UI 组件架构

**主要页面组件**：

1. **欢迎页** (`components/welcome/WelcomePage.tsx`)：
   - 打卡动画
   - NPC 头像展示
   - 倒计时跳转

2. **对话页** (`components/chat/ChatPage.tsx`)：
   - 对话气泡列表
   - NPC 头像动画
   - 语音控制按钮

3. **任务页** (`components/tasks/TaskPage.tsx`)：
   - 任务卡片列表
   - 任务详情弹窗
   - 进度展示

4. **奖励页** (`components/rewards/RewardPage.tsx`)：
   - 奖励动画
   - 积分展示
   - 奖励历史

**通用组件**：

- `VADIndicator`：语音活动检测指示器
- `AudioPlayer`：音频播放器
- `AudioRecorder`：音频录制器
- `MessageBubble`：对话气泡
- `TaskCard`：任务卡片
- `RewardAnimation`：奖励动画

### 音频处理

**音频编码/解码**：

- 使用 `libopus.js` 进行 Opus 编码/解码
- 音频格式：16kHz，单声道，Opus
- 分帧处理：60ms 一帧（960 采样点）

**VAD 检测**：

- 使用 WebAssembly 运行 Silero VAD 模型
- 实时检测语音活动
- 自动开始/停止录音

### 连接管理

**OTA 配置获取**：

```typescript
// 通过 OTA 接口获取 WebSocket 地址
const { wsUrl } = await connectViaOTA(otaUrl, {
  deviceId,
  clientId,
  deviceName,
  deviceMac,
  token
});
```

**WebSocket 连接**：

- 自动重连机制
- 心跳保活
- 错误处理和重试

### 动画与交互

**动画效果**：

- NPC 说话时头像发光动画
- 音波律动效果
- 奖励获得时的粒子特效
- 页面切换的渐入动画

**交互反馈**：

- 点击气泡可重播语音
- 语音开关控制 TTS 播报
- 任务卡片点击查看详情

## 技术栈（预期）

- **框架**：Next.js 13+（App Router）
- **语言**：TypeScript
- **样式**：TailwindCSS
- **UI 组件**：Radix UI
- **状态管理**：React Context + Hooks
- **WebSocket**：原生 WebSocket API
- **音频处理**：Web Audio API、libopus.js
- **VAD**：@ricky0123/vad-web 或 onnxruntime-web
- **数据存储**：Supabase（对话历史、用户信息）

## 项目结构（预期）

```
tour_frontend/
├── app/                      # Next.js 应用路由
│   ├── page.tsx             # 主页面（对话界面）
│   ├── tasks/               # 任务页面
│   ├── rewards/             # 奖励页面
│   └── layout.tsx           # 根布局
├── components/               # 组件
│   ├── chat/                # 对话相关组件
│   ├── tasks/               # 任务相关组件
│   ├── rewards/             # 奖励相关组件
│   ├── audio/               # 音频处理组件
│   └── ui/                  # UI 基础组件
├── hooks/                    # 自定义 Hooks
│   ├── use-voice-chat.ts    # 语音对话 Hook
│   ├── use-websocket.ts     # WebSocket Hook
│   └── use-vad.ts           # VAD 检测 Hook
├── lib/                      # 工具库
│   ├── websocket.ts         # WebSocket 连接管理
│   ├── audio/               # 音频处理工具
│   ├── opus.ts              # Opus 编码/解码
│   ├── supabase.ts          # Supabase 客户端
│   └── utils.ts             # 工具函数
└── public/                   # 静态资源
    ├── libopus.js           # Opus 库
    └── silero_vad_v5.onnx   # VAD 模型
```

## 开发计划

1. **第一阶段**：基础 WebSocket 连接和文本对话
2. **第二阶段**：音频录制和播放
3. **第三阶段**：VAD 检测和自动录音
4. **第四阶段**：任务和奖励系统集成
5. **第五阶段**：动画和交互优化

## 参考实现

- **xiaozhi_web**：小智 Web 端实现（WebSocket + 语音处理）
- **tour_backend/test/test_page.html**：测试页面示例

## 注意事项

- 需要支持儿童友好的 UI 设计（大字体、高对比度、简单交互）
- 所有文字需要同步语音播报
- 动画节奏要适中，避免过度刺激
- 需要适配打卡终端设备（10 寸屏幕）

