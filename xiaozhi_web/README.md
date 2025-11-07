# 小智 Web 前端

基于 Next.js 的 Web 端语音助手客户端，通过 WebSocket 与后端语音服务连接，实现实时语音对话功能。

## 快速开始

```bash
# 复制环境变量模板
cp env_template .env

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 代码逻辑

### 应用启动流程

1. **入口页面** (`app/page.tsx`)：
   - 加载 Opus 编码库（`libopus.js`）
   - 初始化 Opus 编码器/解码器
   - 从环境变量读取配置（OTA URL、设备 ID 等）
   - 加载 NPC 信息和用户信息（从 Supabase）
   - 初始化 VAD 检测

2. **连接建立**：
   - 通过 OTA 接口获取 WebSocket 地址（`connectViaOTA`）
   - 建立 WebSocket 连接（携带 device-id、client-id、token）
   - 发送 `hello` 消息初始化会话

### 语音处理流程

**完整流程**：VAD 检测 → 音频采集 → Opus 编码 → WebSocket 发送 → 接收 TTS 音频 → Opus 解码 → 播放

1. **VAD 检测** (`hooks/use-advanced-vad.ts`)：
   - 使用 `@ricky0123/vad-web` 库运行 Silero VAD 模型
   - 实时检测语音活动（说话/静音）
   - 检测到语音开始 → 触发录音
   - 检测到语音结束 → 停止录音并发送音频

2. **音频采集** (`lib/audio/audio-recorder.ts`)：
   - 使用 `getUserMedia` API 获取麦克风权限
   - 创建 `AudioContext` 和 `ScriptProcessorNode`
   - 实时采集音频数据（16kHz，单声道，Float32）
   - 通过回调函数传递音频数据

3. **音频编码** (`lib/opus.ts`)：
   - 使用 `libopus.js`（WebAssembly）进行 Opus 编码
   - 将 Float32 PCM 转换为 Int16 PCM
   - 编码为 Opus 格式（60ms 一帧，960 采样点）
   - 通过 WebSocket 发送二进制音频数据

4. **音频接收与播放** (`lib/audio/audio-player.ts`)：
   - 接收服务器返回的 Opus 音频流
   - 使用 Opus 解码器解码为 PCM
   - 转换为 Float32 格式
   - 使用 `AudioContext` 创建 `AudioBuffer` 并播放
   - 支持音频队列，连续播放多个音频片段

### WebSocket 通信

**协议实现** (`lib/protocols/websocket-protocol.ts`)：
- 连接管理：建立连接、自动重连、错误处理
- 消息类型：
  - `hello`：连接初始化，返回 session_id
  - `stt`：语音识别结果（文字）
  - `llm`：大语言模型生成的回复文字
  - `tts`：语音合成状态（start/sentence_start/sentence_end/stop）
  - `mcp`：工具调用结果
  - `goodbye`：断开连接

**消息发送**：
- 文本消息：JSON 格式，通过 `sendText` 发送
- 音频消息：二进制 Opus 数据，通过 `sendAudio` 发送

**消息接收**：
- JSON 消息：解析后触发 `onIncomingJson` 回调
- 二进制消息：直接触发 `onIncomingAudio` 回调

### 应用状态管理

**Application 类** (`lib/application.ts`)：
- 单例模式，统一管理应用状态
- 设备状态：`IDLE` / `LISTENING` / `SPEAKING`
- 监听模式：`MANUAL`（手动） / `AUTO_STOP`（自动停止） / `REALTIME`（实时）
- 状态回调：`onDeviceStateChanged`、`onIncomingJson`、`onNetworkError`

**主要方法**：
- `startListeningManual()`：手动开始录音
- `stopListeningManual()`：手动停止录音
- `startAutoConversation()`：自动对话模式（连续监听）
- `stopConversation()`：停止对话

### OTA 配置获取

**连接流程** (`lib/xiaoZhiConnect.ts`)：
1. 调用 OTA 接口（`/xiaozhi/ota/`）
2. 发送设备信息（device-id、client-id、设备信息等）
3. 获取 WebSocket 地址和 Token
4. 构建完整的 WebSocket URL（包含认证参数）

### VAD 检测机制

**高级 VAD Hook** (`hooks/use-advanced-vad.ts`)：
- 状态管理：`NOT_INITIALIZED` → `INITIALIZING` → `READY` → `SPEAKING` / `SILENCE`
- 配置参数：
  - `threshold`：检测阈值（默认 0.3）
  - `minSpeechFrames`：最小语音帧数（默认 3）
  - `minSilenceFrames`：最小静音帧数（默认 5）
- 回调函数：
  - `onSpeechStartCallback`：语音开始时触发
  - `onSpeechEndCallback`：语音结束时触发

### 对话状态管理

**主页面状态** (`app/page.tsx`)：
- `conversationState`：对话状态（监听中/说话中/处理中）
- `messages`：对话历史列表
- `isCalling`：是否在通话中
- `vadState`：VAD 检测状态
- `audioBuffers`：音频缓冲区（用于累积音频数据）

**对话流程**：
1. 用户点击"开始通话" → 启动 VAD 检测
2. VAD 检测到语音 → 开始录音
3. VAD 检测到静音 → 停止录音并发送音频
4. 服务器返回 STT 结果 → 显示识别文字
5. 服务器返回 LLM 回复 → 显示回复文字
6. 服务器返回 TTS 音频 → 播放语音

### Supabase 集成

**数据存储** (`lib/supabase.ts`)：
- **NPC 信息**：根据设备 ID 获取当前 NPC
- **用户信息**：根据用户 ID 或用户名获取用户
- **对话历史**：保存和加载对话记录
- **对话完成**：标记对话完成状态

**主要函数**：
- `getCurrentDeviceNPC()`：获取当前设备的 NPC
- `getUserById()` / `getUserByName()`：获取用户信息
- `saveDialogue()`：保存单条对话
- `saveCompleteDialogue()`：保存完整对话
- `getDialogueHistory()`：加载对话历史

### 音频处理细节

**音频格式**：
- 采样率：16kHz
- 声道：单声道
- 格式：Float32（采集） → Int16（编码） → Opus（传输）

**帧处理**：
- 帧大小：960 采样点（60ms @ 16kHz）
- 分帧发送：累积音频数据，达到一帧后发送
- 缓冲区管理：使用 `BlockingQueue` 管理音频队列

**Opus 编码/解码**：
- 编码器：单例模式，全局共享
- 解码器：每个 `AudioPlayer` 实例一个
- 错误处理：编码/解码失败时降级处理

### UI 组件

**主要组件**：
- `VADIndicator`：VAD 状态指示器（显示是否检测到语音）
- `ChatInterface`：对话界面（消息列表、输入框）
- `ConnectionForm`：连接配置表单

**状态显示**：
- 连接状态：未连接 / 连接中 / 已连接
- 设备状态：空闲 / 监听中 / 说话中
- VAD 状态：就绪 / 检测到语音 / 静音

### 错误处理

**连接错误**：
- WebSocket 连接失败 → 自动重连（最多 5 次）
- OTA 接口失败 → 显示错误提示
- 认证失败 → 提示检查 Token

**音频错误**：
- 麦克风权限被拒绝 → 提示用户授权
- AudioContext 初始化失败 → 显示浏览器兼容性提示
- Opus 编码/解码失败 → 降级到 PCM 格式

**VAD 错误**：
- VAD 初始化失败 → 显示详细错误信息
- 模型加载失败 → 提示检查网络连接

## 技术栈

- **框架**：Next.js 13（App Router）
- **语言**：TypeScript
- **样式**：TailwindCSS
- **UI 组件**：Radix UI
- **WebSocket**：原生 WebSocket API
- **音频处理**：Web Audio API
- **VAD**：@ricky0123/vad-web（Silero VAD）
- **音频编码**：libopus.js（WebAssembly）
- **数据存储**：Supabase
- **状态管理**：React Hooks

## 项目结构

```
xiaozhi_web/
├── app/                      # Next.js 应用路由
│   ├── page.tsx             # 主页面（语音对话界面）
│   ├── page-v1.tsx         # 旧版本页面
│   └── layout.tsx          # 根布局
├── components/               # 组件
│   ├── voice-chat/         # 语音对话组件
│   │   ├── chat-interface.tsx
│   │   ├── connection-form.tsx
│   │   └── VADIndicator.tsx
│   └── ui/                 # UI 基础组件
├── hooks/                    # 自定义 Hooks
│   ├── use-advanced-vad.ts  # VAD 检测 Hook
│   ├── use-voice-chat.ts    # 语音对话 Hook
│   └── use-toast.ts         # Toast 提示 Hook
├── lib/                      # 工具库
│   ├── application.ts       # 应用主类（单例）
│   ├── audio/               # 音频处理
│   │   ├── audio-recorder.ts
│   │   └── audio-player.ts
│   ├── protocols/           # 通信协议
│   │   ├── websocket-protocol.ts
│   │   ├── mqtt-protocol.ts
│   │   └── protocol.ts
│   ├── opus.ts              # Opus 编码/解码
│   ├── xiaoZhiConnect.ts   # OTA 连接
│   ├── supabase.ts          # Supabase 客户端
│   ├── StreamingContext.ts  # 流式上下文
│   └── BlockingQueue.ts     # 阻塞队列
└── public/                   # 静态资源
    ├── libopus.js           # Opus 库（WebAssembly）
    └── silero_vad_v5.onnx   # VAD 模型
```

## 环境变量配置

在 `.env` 文件中配置：

```
NEXT_PUBLIC_OTA_URL=http://127.0.0.1:8003/xiaozhi/ota/
NEXT_PUBLIC_NPC_DEVICE_ID=your-npc-id
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
```

## 使用说明

1. **配置环境变量**：复制 `env_template` 为 `.env` 并填写配置
2. **启动后端服务**：确保 `tour_backend` 服务正在运行
3. **启动前端**：运行 `npm run dev`
4. **开始对话**：
   - 输入用户 ID 或用户名
   - 点击"开始通话"按钮
   - 允许麦克风权限
   - 开始语音对话

## 注意事项

- 需要 HTTPS 或 localhost 才能使用麦克风 API
- 首次使用需要授予浏览器麦克风权限
- Opus 库需要从 `public/libopus.js` 加载
- VAD 模型需要从 `public/silero_vad_v5.onnx` 加载
- 确保后端服务已启动并配置正确