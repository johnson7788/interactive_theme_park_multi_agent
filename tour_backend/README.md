# 小智语音助手 - 后端服务

基于 WebSocket 的实时语音对话服务，支持语音识别、大语言模型对话、语音合成等功能。

## 快速开始

```bash
# 安装依赖
pip install -r requirements.txt

# 创建配置文件（在 data 目录下创建 .config.yaml）
mkdir -p data
touch data/.config.yaml

# 运行服务
python app.py
```

## 代码逻辑

### 应用启动流程

1. **入口文件** (`app.py`)：
   - 检查 FFmpeg 是否安装
   - 加载配置文件（本地或从管理 API）
   - 生成或验证认证密钥（auth_key）
   - 启动 WebSocket 服务器（默认端口 8000）
   - 启动 HTTP 服务器（默认端口 8003）
   - 监控标准输入，等待退出信号

2. **配置加载** (`config/config_loader.py`)：
   - 优先读取 `data/.config.yaml`（用户自定义配置）
   - 合并 `config.yaml`（默认配置）
   - 支持从管理 API 动态获取配置
   - 配置缓存机制，避免重复加载

### 服务器架构

**WebSocket 服务器** (`core/websocket_server.py`)：
- 监听客户端连接（设备 ID、客户端 ID）
- 连接认证（JWT Token 或设备白名单）
- 为每个连接创建独立的 `ConnectionHandler`
- 支持动态更新配置（热重载）

**HTTP 服务器** (`core/http_server.py`)：
- OTA 接口：设备配置下发（`/xiaozhi/ota/`）
- 视觉分析接口：图像识别分析（`/mcp/vision/explain`）
- 支持 CORS 跨域请求

### 连接处理机制

**ConnectionHandler** (`core/connection.py`)：
- 每个 WebSocket 连接对应一个独立的处理器
- 管理连接状态：设备绑定、会话 ID、音频格式等
- 处理两种消息类型：
  - **音频消息**：实时语音流，经过 VAD → ASR → LLM → TTS 流程
  - **文本消息**：JSON 格式的控制消息（hello、abort、listen 等）

### 语音处理流程

1. **接收音频** (`core/handle/receiveAudioHandle.py`)：
   - VAD（语音活动检测）：判断是否有人说话
   - 唤醒检测：设备唤醒后短暂忽略 VAD
   - 打断机制：检测到新语音时中断当前播放

2. **语音识别** (ASR)：
   - 支持多种 ASR 提供商（阿里云、百度、豆包、FunASR、OpenAI 等）
   - 流式识别：实时返回识别结果
   - 音频格式：支持 Opus、PCM 等

3. **意图理解** (Intent)：
   - 识别用户意图（退出、切换角色等）
   - 支持函数调用（Function Calling）
   - 插件系统：自定义功能扩展

4. **对话生成** (LLM)：
   - 支持多种 LLM 提供商（OpenAI、通义千问、Gemini、Ollama 等）
   - 上下文管理：对话历史、记忆检索
   - 工具调用：支持 MCP（Model Context Protocol）工具

5. **语音合成** (TTS)：
   - 支持多种 TTS 提供商（Edge TTS、Azure、OpenAI 等）
   - 流式输出：实时生成并发送音频
   - 支持 SSML 标记语言

### 模块化架构

**模块初始化** (`core/utils/modules_initialize.py`)：
- 根据配置动态加载模块（VAD、ASR、LLM、TTS、Memory、Intent）
- 支持多种提供商实现，可灵活切换
- 模块间解耦，便于扩展

**主要模块**：
- **VAD**：语音活动检测（Silero VAD）
- **ASR**：语音转文字（多种云端/本地方案）
- **LLM**：大语言模型对话
- **TTS**：文字转语音
- **Memory**：对话记忆管理（Mem0、本地短记忆）
- **Intent**：意图识别和函数调用

### 消息处理系统

**文本消息处理** (`core/handle/textMessageProcessor.py`)：
- 注册表模式：不同类型消息对应不同处理器
- 支持的消息类型：
  - `hello`：连接初始化
  - `abort`：中断当前操作
  - `listen`：切换监听模式
  - `iot`：IoT 设备控制
  - `mcp`：MCP 工具调用
  - `server`：服务器消息

**音频消息处理** (`core/handle/receiveAudioHandle.py`)：
- 实时处理音频流
- VAD 检测 → ASR 识别 → 意图理解 → LLM 生成 → TTS 合成
- 支持打断和恢复机制

### 认证与安全

**认证机制** (`core/auth.py`)：
- JWT Token 认证
- 设备白名单（免认证）
- Token 过期时间可配置
- 支持从 URL 参数或请求头获取认证信息

**安全特性**：
- 敏感信息过滤（日志脱敏）
- 设备输出限制（防止滥用）
- 连接超时检测

### 配置管理

**配置文件优先级**：
1. `data/.config.yaml`（用户自定义，最高优先级）
2. `config.yaml`（默认配置）
3. 管理 API（如果启用 `read_config_from_api`）

**配置内容**：
- 服务器地址和端口
- 模块选择（VAD、ASR、LLM、TTS 等）
- 各模块的提供商配置
- 认证设置
- 日志配置

### 插件系统

**功能插件** (`plugins_func/`)：
- 自动扫描并加载插件函数
- 支持自定义功能扩展
- 示例插件：天气查询、时间获取、音乐播放、Home Assistant 控制等

**插件注册** (`plugins_func/register.py`)：
- 使用装饰器注册插件函数
- 自动生成函数描述供 LLM 调用

### 工具与工具调用

**MCP 工具** (`core/providers/tools/`)：
- 支持 MCP（Model Context Protocol）协议
- 工具统一处理（`unified_tool_handler.py`）
- 视觉分析工具：图像识别和描述

**工具调用流程**：
1. LLM 决定调用工具
2. 执行工具函数
3. 将结果返回给 LLM
4. LLM 生成最终回复

### 数据上报

**上报机制** (`core/handle/reportHandle.py`)：
- 异步上报 ASR 和 TTS 数据到管理后台
- 使用队列缓冲，避免阻塞主流程
- 支持配置开关

### 特殊功能

**设备绑定**：
- 新设备首次连接需要绑定码
- 绑定码通过音频提示播放
- 绑定成功后保存设备信息

**视觉分析**：
- 接收图像数据（Base64 编码）
- 调用视觉 LLM 分析图像内容
- 返回文字描述

**OTA 配置下发**：
- 设备通过 HTTP 请求获取配置
- 返回 WebSocket 地址、MQTT 配置等
- 支持 JWT Token 认证

## 技术栈

- **WebSocket**：websockets（异步 WebSocket 服务器）
- **HTTP 服务**：aiohttp（异步 HTTP 框架）
- **语音识别**：FunASR、阿里云、百度、豆包等
- **语音合成**：Edge TTS、Azure、OpenAI 等
- **大语言模型**：OpenAI、通义千问、Gemini、Ollama 等
- **语音活动检测**：Silero VAD
- **音频编码**：Opus（opuslib_next）
- **配置管理**：YAML（ruamel.yaml）
- **日志**：Loguru

## 项目结构

```
tour_backend/
├── app.py                      # 应用入口
├── config.yaml                 # 默认配置文件
├── config/                     # 配置模块
│   ├── config_loader.py       # 配置加载器
│   ├── settings.py            # 配置验证
│   └── manage_api_client.py   # 管理 API 客户端
├── core/                       # 核心模块
│   ├── websocket_server.py    # WebSocket 服务器
│   ├── http_server.py         # HTTP 服务器
│   ├── connection.py         # 连接处理器
│   ├── handle/                # 消息处理
│   │   ├── receiveAudioHandle.py  # 音频处理
│   │   ├── textHandle.py          # 文本处理
│   │   └── ...
│   ├── providers/             # 功能提供商
│   │   ├── asr/              # 语音识别
│   │   ├── tts/              # 语音合成
│   │   ├── llm/              # 大语言模型
│   │   ├── vad/              # 语音活动检测
│   │   ├── memory/           # 记忆管理
│   │   └── tools/            # 工具调用
│   └── utils/                 # 工具函数
├── plugins_func/              # 功能插件
└── test/                      # 测试页面

