# FastRTC

---

## 安装与设置

1. 创建 `.env` 文件，并设置你的 API 密钥。
```
cd backend
cp env_template .env
```
2. 创建虚拟环境并安装依赖：

   ```bash
   python3 -m venv env
   source env/bin/activate
   pip install -r requirements.txt
   ```

3. 启动后端服务器：

   ```bash
   ./start.sh
   ```

4. 在另一个终端中进入前端目录：

   ```bash
   cd frontend/fastrtc-demo
   ```

5. 运行前端：

   ```bash
   npm install
   npm run dev
   ```

6. 打开生成的 URL，点击麦克风图标即可开始语音聊天！

7. 点击右下角的垃圾桶按钮可重置聊天记录。

---

## 备注

你可以选择不安装 TTS（文本转语音）和 STT（语音转文本）相关依赖，只需在 `requirements.txt` 文件中删除 `[tts, stt]`。

* **STT（语音转文字）**：目前使用 **ElevenLabs API**
* **LLM（大语言模型）**：目前使用 **OpenAI API**
* **TTS（文字转语音）**：目前使用 **ElevenLabs API**
* **VAD（语音活动检测）**：使用 **Silero VAD 模型**
* 如果在 STT 阶段出现错误，可能需要安装 **ffmpeg**

你可以在 `backend/server.py` 文件中修改提示词（prompt），根据需要调整聊天风格或人格设定。

---

## 音频参数说明

### AlgoOptions 参数

* **audio_chunk_duration**：音频分块的时长（秒）。数值越小，处理越快，但可能影响准确度。
* **started_talking_threshold**：若音频块中语音时长超过该值，则认为用户已开始讲话。
* **speech_threshold**：当用户开始讲话后，如果音频块中的语音时长低于该值，则认为用户暂停讲话。

### SileroVadOptions 参数

* **threshold**：语音概率阈值（0.0–1.0）。高于该值的部分视为语音。值越高越严格。
* **min_speech_duration_ms**：短于此值（毫秒）的语音片段将被过滤。
* **min_silence_duration_ms**：系统等待此时间（毫秒）的静音后，才判断语音已结束。
* **speech_pad_ms**：在检测到的语音两端添加的缓冲时间（毫秒），防止单词被截断。
* **max_speech_duration_s**：单次语音段的最长时长（秒），防止系统无限监听。

---

## 参数调优建议

### 如果 AI 太早打断你：

* 增大 `min_silence_duration_ms`
* 增大 `speech_threshold`
* 增大 `speech_pad_ms`

### 如果 AI 在你说完后响应太慢：

* 减小 `min_silence_duration_ms`
* 减小 `speech_threshold`

### 如果系统漏识别了一些语音：

* 降低 `threshold` 值
* 减小 `started_talking_threshold`

## 实际测试发现，延迟太高了