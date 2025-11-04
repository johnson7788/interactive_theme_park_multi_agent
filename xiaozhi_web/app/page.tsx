'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import { connectViaOTA } from '@/lib/xiaoZhiConnect';
import { initOpusEncoder, checkOpusLoaded, type OpusEncoderHandle, createOpusDecoder } from '@/lib/opus';
import { createStreamingContext, StreamingContext } from '@/lib/StreamingContext';
import BlockingQueue from '@/lib/BlockingQueue';
import { getUserByName, getNPCById, getCurrentDeviceNPC } from '@/lib/supabase';

const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const FRAME_SIZE = 960;     // 60ms @ 16k
const MIN_AUDIO_DURATION = 0.1; // s

type TtsStateMsg = { type:'tts'; state:'start'|'sentence_start'|'sentence_end'|'stop'; text?:string };
type HelloMsg   = { type:'hello'; session_id?:string };
type LlmMsg     = { type:'llm'; text?:string };
type SttMsg     = { type:'stt'; text?:string };
type McpMsg     = { type:'mcp'; payload?: any };

export default function Page() {
  // ==== 配置与状态 ====  
  // 从环境变量读取 OTA URL
  const otaUrl = process.env.NEXT_PUBLIC_OTA_URL || 'http://127.0.0.1:8002/xiaozhi/ota/';
  const [serverUrl, setServerUrl] = useState<string>('');
  const [deviceMac, setDeviceMac] = useState<string>('');
  const [deviceName, setDeviceName] = useState('Web测试设备');
  const [clientId, setClientId] = useState('web_test_client');
  const [token, setToken] = useState('your-token1');
  const [userId, setUserId] = useState('测试张三');
  const [showUserIdModal, setShowUserIdModal] = useState(true);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  // 从环境变量读取设备ID
  const [deviceId, setDeviceId] = useState<string>(process.env.NEXT_PUBLIC_NPC_DEVICE_ID || '');
  // 新增NPC信息状态
  const [npcInfo, setNpcInfo] = useState<any>(null);
  
  // 新增状态管理
  const [childInfo, setChildInfo] = useState<any>(null);
  const [showChildInfo, setShowChildInfo] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // 客户端初始化localStorage
  useEffect(() => {
    const savedUserId = localStorage.getItem('userId');
    const savedDeviceMac = localStorage.getItem('deviceMac');
    const savedDeviceId = localStorage.getItem('deviceId');

    if (savedUserId) {
      setUserId(savedUserId);
      setShowUserIdModal(false);
    }

    setDeviceMac(savedDeviceMac || genMac());
    setDeviceId(savedDeviceId || process.env.NEXT_PUBLIC_NPC_DEVICE_ID || '');
  }, []);

  const [otaOk, setOtaOk] = useState(false);
  const [wsOk, setWsOk] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [opusReady, setOpusReady] = useState(false);

  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<Array<{text: string, isUser: boolean, timestamp: Date}>>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const vizIdRef = useRef<number | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  const queueRef = useRef(new BlockingQueue<Uint8Array>());
  const streamingRef = useRef<StreamingContext | null>(null);
  const opusDecoderRef = useRef<ReturnType<typeof createOpusDecoder> | null>(null);
  const opusEncoderRef = useRef<OpusEncoderHandle | null>(null);

  // 自动滚动到最新消息
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // 为 logger/状态展示提供便捷函数
  const log = (msg: string, level: 'info'|'error'|'warning'|'success'|'debug'='info') => {
    const t = new Date();
    const ts = `[${t.toLocaleTimeString()}.${String(t.getMilliseconds()).padStart(3,'0')}] `;
    const logMsg = `${ts}${msg}`;

    // debug 日志也显示，但用灰色
    if (level !== 'debug') {
      setLogs(prev => [...prev, logMsg]);
    }

    // 控制台打印
    if (level === 'error') console.error(logMsg);
    else if (level === 'warning') console.warn(logMsg);
    else if (level === 'debug') console.debug(logMsg);
    else console.log(logMsg);
  };

  const addMessage = (text: string, isUser = false) => {
    setConversation(prev => [...prev, { text: isUser ? text : text, isUser, timestamp: new Date() }]);
  };

  useEffect(() => {
    localStorage.setItem('deviceMac', deviceMac);
  }, [deviceMac]);

  // 保存设备ID到localStorage
  useEffect(() => {
    if (deviceId) {
      localStorage.setItem('deviceId', deviceId);
    }
  }, [deviceId]);

  // 根据设备ID获取NPC信息
  useEffect(() => {
    const fetchNpcInfo = async () => {
      if (deviceId) {
        try {
          const npc = await getNPCById(deviceId);
          if (npc) {
            setNpcInfo(npc);
          }
        } catch (error) {
          console.error('获取NPC信息失败:', error);
        }
      } else {
        // 如果没有提供特定的deviceId，使用当前设备默认的NPC
        try {
          const npc = await getCurrentDeviceNPC();
          if (npc) {
            setNpcInfo(npc);
          }
        } catch (error) {
          console.error('获取默认NPC信息失败:', error);
        }
      }
    };

    fetchNpcInfo();
  }, [deviceId]);

  // 用户ID输入处理
  const handleUserIdSubmit = async () => {
    if (userId.trim()) {
      try {
        // 先清空之前的错误信息
        setShowError(false);
        // 设置加载中状态
        setIsLoading(true);
        
        // 根据用户名查询小朋友信息
        const userInfo = await getUserByName(userId.trim());
        
        if (userInfo) {
          // 查询成功，记录信息
          setChildInfo(userInfo);
          setShowChildInfo(true);
          
          // 保存用户信息到localStorage
          localStorage.setItem('userId', userId.trim());
          localStorage.setItem('childInfo', JSON.stringify(userInfo));
          
          // 保存设备ID到localStorage
          if (deviceId.trim()) {
            localStorage.setItem('deviceId', deviceId.trim());
          }
          
          // 延迟隐藏弹窗并连接，让用户有时间查看信息
          setTimeout(() => {
            setShowUserIdModal(false);
            setShowChildInfo(false);
            // 自动连接
            connect();
          }, 3000);
        } else {
          // 查询失败，显示错误信息
          setErrorMessage('找不到该小朋友的信息，请检查名字是否正确！');
          setShowError(true);
        }
      } catch (error) {
        // 捕获异常，显示错误信息
        setErrorMessage('查询失败，请稍后再试！');
        setShowError(true);
        console.error('查询小朋友信息失败:', error);
      } finally {
        // 无论成功失败，都要重置加载状态
        setIsLoading(false);
      }
    }
  };

  // 结束对话
  const endConversation = () => {
    disconnect();
    setConversation([]);
    setLogs([]);
    setShowUserIdModal(true);
    setUserId('');
    localStorage.removeItem('userId');
  };

  // ==== 载入 libopus.js 并检查 ====
  useEffect(() => {
    // 延迟检查，确保 libopus.js 已完全加载
    const checkTimer = setTimeout(() => {
      const anyWin = window as any;

      const logMsg = (msg: string, level: 'info'|'error'|'success' = 'info') => {
        const t = new Date();
        const ts = `[${t.toLocaleTimeString()}.${String(t.getMilliseconds()).padStart(3,'0')}] `;
        const fullMsg = `${ts}${msg}`;
        setLogs(prev => [...prev, fullMsg]);
        if (level === 'error') console.error(fullMsg);
        else console.log(fullMsg);
      };

      logMsg('开始检查 Opus 库...', 'info');
      console.log('window.Module:', anyWin.Module);
      console.log('window.Module type:', typeof anyWin.Module);

      if (anyWin.Module) {
        console.log('Module.instance:', anyWin.Module.instance);
        console.log('Module._opus_decoder_get_size:', typeof anyWin.Module._opus_decoder_get_size);
      }

      checkOpusLoaded({
        onOk: () => {
          logMsg('✓ Opus库加载成功', 'success');
          setOpusReady(true);
        },
        onFail: (e) => {
          logMsg(`✗ Opus库加载失败: ${e}`, 'error');
          setOpusReady(false);
        }
      });
    }, 1000); // 等待1秒确保 libopus.js 加载完成

    return () => clearTimeout(checkTimer);
  }, []);

  const handleOpusReady = () => {
    log('libopus.js Script 标签触发 onReady', 'info');
  };

  // ==== 可视化 ====
  const draw = () => {
    if (!isRecording || !analyserRef.current || !canvasRef.current) return;
    const analyser = analyserRef.current;
    const cvs = canvasRef.current;
    const ctx = cvs.getContext('2d')!;
    const arr = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(arr);

    ctx.clearRect(0, 0, cvs.width, cvs.height);
    const barWidth = (cvs.width / arr.length) * 2.5;
    let x = 0;
    for (let i = 0; i < arr.length; i++) {
      const h = arr[i] / 2;
      ctx.fillStyle = `rgb(${h + 100}, 50, 50)`;
      ctx.fillRect(x, cvs.height - h, barWidth, h);
      x += barWidth + 1;
    }
    vizIdRef.current = requestAnimationFrame(draw);
  };

  const ensureAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: SAMPLE_RATE,
        latencyHint: 'interactive'
      });
      log(`创建音频上下文，采样率 ${SAMPLE_RATE}Hz`, 'debug');
    }
    return audioCtxRef.current;
  };

  // ==== 连接逻辑（OTA→WS） ====
  const connect = async () => {
    if (connecting || wsRef.current) return;
    setConnecting(true);
    setOtaOk(false);
    setWsOk(false);

    try {
      const cfg = {
        deviceId: deviceMac,
        deviceName,
        deviceMac,
        clientId,
        token,
      };
      const res = await connectViaOTA(otaUrl, cfg);
      if (!res) {
        log('无法从OTA获取WS信息', 'error');
        setConnecting(false);
        return;
      }
      setOtaOk(true);
      setServerUrl(res.wsUrl);
      log(`正在连接: ${res.wsUrl}`, 'info');

      const ws = new WebSocket(res.wsUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = async () => {
        setWsOk(true);
        log('WS 已连接', 'success');
        // 发送 hello
        const hello = { type: 'hello', device_id: cfg.deviceId, device_name: cfg.deviceName, device_mac: cfg.deviceMac, token: cfg.token, features: { mcp: true } };
        ws.send(JSON.stringify(hello));

        // 预热音频系统
        ensureAudioContext();
        analyserRef.current = audioCtxRef.current!.createAnalyser();
        analyserRef.current!.fftSize = 2048;

        // 等待 ModuleInstance 准备好
        const waitForModule = async () => {
          const anyWin = window as any;
          let attempts = 0;
          while (!anyWin.ModuleInstance && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
          return anyWin.ModuleInstance;
        };

        const mod = await waitForModule();
        if (!mod) {
          log('Opus 模块未加载，音频功能可能不可用', 'error');
          return;
        }

        // 预加载 Opus 解码器
        try {
          opusDecoderRef.current = createOpusDecoder({
            sampleRate: SAMPLE_RATE,
            channels: CHANNELS,
            frameSize: FRAME_SIZE
          });
          log('Opus 解码器预加载成功', 'success');
        } catch (e:any) {
          log(`Opus 解码器预加载失败: ${e?.message || e}`, 'warning');
        }

        // 建立 streaming context
        if (!streamingRef.current && opusDecoderRef.current) {
          streamingRef.current = createStreamingContext(opusDecoderRef.current!, audioCtxRef.current!, SAMPLE_RATE, CHANNELS, MIN_AUDIO_DURATION);
          streamingRef.current.decodeOpusFrames();
          streamingRef.current.startPlaying();
        }
      };

      ws.onclose = () => {
        setWsOk(false);
        wsRef.current = null;
        log('WS 已断开', 'warning');
        setIsRecording(false);
        if (vizIdRef.current) cancelAnimationFrame(vizIdRef.current);
      };

      ws.onerror = (ev: any) => {
        log(`WS 错误: ${ev?.message || '未知错误'}`, 'error');
      };

      ws.onmessage = async (ev) => {
        try {
          if (typeof ev.data === 'string') {
            const msg = JSON.parse(ev.data) as HelloMsg | TtsStateMsg | LlmMsg | SttMsg | McpMsg | any;
            switch (msg.type) {
              case 'hello': {
                const m = msg as HelloMsg;
                if (m.session_id) log(`服务器握手成功，会话ID: ${m.session_id}`, 'success');
                break;
              }
              case 'tts': {
                const m = msg as TtsStateMsg;
                if (m.state === 'sentence_start' && m.text) addMessage(m.text);
                if (m.state === 'stop') {
                  if (isRecording) setIsRecording(false);
                }
                break;
              }
              case 'stt': {
                const m = msg as SttMsg;
                if (m.text) addMessage(`[语音识别] ${m.text}`, true);
                break;
              }
              case 'llm': {
                const m = msg as LlmMsg;
                if (m.text && m.text !== '😊') addMessage(m.text);
                break;
              }
              case 'mcp': {
                // 模拟 tools/list & tools/call
                const payload = (msg as McpMsg).payload;
                if (payload?.method === 'tools/list') {
                  const reply = {
                    session_id: '',
                    type: 'mcp',
                    payload: {
                      jsonrpc: '2.0',
                      id: 2,
                      result: {
                        tools: [
                          { name: 'self.get_device_status', description: '...', inputSchema: { type: 'object', properties: {} } },
                          { name: 'self.audio_speaker.set_volume', description: '...', inputSchema: { type: 'object', properties: { volume: { type: 'integer', minimum: 0, maximum: 100 } }, required: ['volume'] } },
                          { name: 'self.screen.set_brightness', description: '...', inputSchema: { type: 'object', properties: { brightness: { type: 'integer', minimum: 0, maximum: 100 } }, required: ['brightness'] } },
                          { name: 'self.screen.set_theme', description: '...', inputSchema: { type: 'object', properties: { theme: { type: 'string' } }, required: ['theme'] } },
                        ]
                      }
                    }
                  };
                  ws.send(JSON.stringify(reply));
                  log('已回复 MCP tools/list', 'info');
                } else if (payload?.method === 'tools/call') {
                  const reply = {
                    session_id: '9f261599', type: 'mcp',
                    payload: { jsonrpc: '2.0', id: payload.id, result: { content: [{ type: 'text', text: 'true' }], isError: false } }
                  };
                  ws.send(JSON.stringify(reply));
                  log('已回复 MCP tools/call', 'info');
                }
                break;
              }
              default:
                addMessage(JSON.stringify(msg));
            }
          } else {
            // 二进制：当作原始 Opus 帧
            const buf = ev.data instanceof Blob ? new Uint8Array(await (ev.data as Blob).arrayBuffer()) : new Uint8Array(ev.data as ArrayBuffer);
            if (buf.byteLength > 0) {
              queueRef.current.enqueue(buf);
              // 交给 streamingRef 解码播放
              streamingRef.current?.pushAudioBuffer([buf]);
            } else {
              // 结束信号
              if (streamingRef.current) streamingRef.current.endOfStream = true;
            }
          }
        } catch (e:any) {
          log(`WS 消息处理错误: ${e?.message || e}`, 'error');
          if (typeof ev.data === 'string') addMessage(ev.data);
        }
      };
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    wsRef.current?.close();
    wsRef.current = null;
  };

  // ==== 文本发送 ====
  const sendText = () => {
    const text = message.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const payload = { type: 'listen', mode: 'manual', state: 'detect', text };
    wsRef.current.send(JSON.stringify(payload));
    addMessage(text, true);
    setMessage('');
  };

  // ==== 录音：PCM→Opus→WS ====
  // 使用 AudioWorklet（可回退 ScriptProcessor）
  const workletCode = `
  class AudioRecorderProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this.frameSize = 960;
      this.buffer = new Int16Array(this.frameSize);
      this.idx = 0;
      this.recording = false;
      this.port.onmessage = (e) => {
        if (e.data.command === 'start') this.recording = true;
        if (e.data.command === 'stop') {
          this.recording = false;
          if (this.idx > 0) {
            const finalB = this.buffer.slice(0, this.idx);
            this.port.postMessage({ type: 'buffer', buffer: finalB });
            this.idx = 0;
          }
        }
      }
    }
    process(inputs) {
      if (!this.recording) return true;
      const ch0 = inputs[0][0];
      if (!ch0) return true;
      for (let i=0; i<ch0.length; i++) {
        if (this.idx >= this.frameSize) {
          this.port.postMessage({ type: 'buffer', buffer: this.buffer.slice(0) });
          this.idx = 0;
        }
        const s = Math.max(-32768, Math.min(32767, Math.floor(ch0[i] * 32767)));
        this.buffer[this.idx++] = s;
      }
      return true;
    }
  }
  registerProcessor('audio-recorder-processor', AudioRecorderProcessor);
  `;

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const startRecording = async () => {
    if (isRecording) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      log('WS 未连接，不能录音', 'error'); return;
    }

    // 等待 ModuleInstance 准备好
    const anyWin = window as any;
    if (!anyWin.ModuleInstance) {
      log('等待 Opus 模块加载...', 'info');
      let attempts = 0;
      while (!anyWin.ModuleInstance && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (!anyWin.ModuleInstance) {
        log('Opus 模块未加载，无法录音', 'error');
        return;
      }
    }

    // 确保编码器（只在第一次初始化）
    if (!opusEncoderRef.current) {
      opusEncoderRef.current = initOpusEncoder({
        sampleRate: SAMPLE_RATE, channels: CHANNELS, frameSize: FRAME_SIZE,
        onLog: (m,l) => log(m, l as any)
      });
      if (!opusEncoderRef.current) {
        log('Opus 编码器初始化失败', 'error'); return;
      }
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, sampleRate: SAMPLE_RATE, channelCount: 1 }
    });
    const ctx = ensureAudioContext();
    const src = ctx.createMediaStreamSource(stream);

    // 可视化链路
    analyserRef.current = ctx.createAnalyser();
    analyserRef.current.fftSize = 2048;
    src.connect(analyserRef.current);
    // 录音处理节点
    try {
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      const node = new (window as any).AudioWorkletNode(ctx, 'audio-recorder-processor');
      node.port.onmessage = (e: MessageEvent) => {
        if (e.data?.type === 'buffer') {
          const frame: Int16Array = e.data.buffer;
          try {
            const encoded = opusEncoderRef.current!.encode(frame);
            if (encoded && encoded.byteLength > 0) {
              wsRef.current!.send(encoded.buffer);
            }
          } catch (err:any) {
            log(`Opus 编码错误: ${err?.message || err}`, 'error');
          }
        }
      };
      // 需要有输出以触发处理（静音增益）
      const silent = ctx.createGain();
      silent.gain.value = 0;
      node.connect(silent); silent.connect(ctx.destination);

      src.connect(node);
      (node as any).__src = src;  // 保存引用，stop 时断开

      // listen start
      wsRef.current.send(JSON.stringify({ type:'listen', mode:'manual', state:'start' }));
      node.port.postMessage({ command: 'start' });

      setIsRecording(true);
      // 启动可视化
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.clientWidth;
        canvasRef.current.height = canvasRef.current.clientHeight;
      }
      vizIdRef.current = requestAnimationFrame(draw);
      log('开始录音（PCM→Opus→WS）', 'success');

      // 把 node 存起来以便 stop
      (window as any).__recNode = node;
    } catch {
      log('AudioWorklet 不可用，请升级浏览器或使用回退方案（略）', 'warning');
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);

    // 停止可视化
    if (vizIdRef.current) {
      cancelAnimationFrame(vizIdRef.current);
      vizIdRef.current = null;
    }

    // 结束录音并发送 stop
    const node: any = (window as any).__recNode;
    if (node?.port) node.port.postMessage({ command: 'stop' });
    if (node?.__src) {
      try { node.disconnect(); node.__src.disconnect(); } catch {}
    }
    (window as any).__recNode = null;

    // 发送空帧 + stop
    try {
      wsRef.current?.send(new Uint8Array(0));
      wsRef.current?.send(JSON.stringify({ type: 'listen', mode: 'manual', state: 'stop' }));
      log('录音停止并发送 stop', 'info');
    } catch {}

    // 注意：不销毁编码器，因为是单例，可以复用
  };

  // ==== UI ====
  return (
      <div className="min-h-screen bg-[url('/NPC-BG.png')] bg-cover bg-center p-4 md:p-8 font-sans">
        {/* 加载 libopus.js */}
        <Script src="/libopus.js" strategy="afterInteractive" onLoad={handleOpusReady} onError={(e) => log('libopus.js 加载失败', 'error')} />

        {/* 用户ID输入弹窗 */}
        {showUserIdModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full transform transition-all duration-300 shadow-2xl border-4 border-yellow-400 ">
                <div className="text-center mb-6">
                  <div className="inline-block p-3 bg-yellow-100 rounded-full mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-purple-800">你好呀！小朋友</h2>
                  <p className="text-gray-600 mt-2">请输入你的名字，开始奇妙的对话之旅吧！</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUserIdSubmit()}
                        className="w-full px-4 py-3 rounded-xl border-2 border-purple-300 focus:border-purple-500 focus:outline-none text-lg text-center transition-all"
                        placeholder="输入你的名字..."
                        autoFocus
                    />
                  </div>
                  <button
                      onClick={handleUserIdSubmit}
                      disabled={!userId.trim() || isLoading}
                      className={`w-full py-3 px-6 rounded-xl text-white font-bold transition-all ${userId.trim() ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' : 'bg-gray-300 cursor-not-allowed'}`}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2 justify-center">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        正在查询...
                      </span>
                    ) : (
                      '开始对话'
                    )}
                  </button>
                </div>
                
                {/* 错误信息显示 */}
                {showError && (
                  <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-center">
                    {errorMessage}
                  </div>
                )}
                
                {/* 小朋友信息显示 */}
                {showChildInfo && childInfo && (
                  <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg animate-fade-in">
                    <div className="text-center">
                      <h3 className="font-bold mb-1">欢迎回来，{childInfo.name}！</h3>
                      <p className="text-sm">你目前的积分为：{childInfo.points}</p>
                      {childInfo.avatar_url && (
                        <img 
                          src={childInfo.avatar_url} 
                          alt={childInfo.name} 
                          className="w-16 h-16 mx-auto mt-2 rounded-full border-2 border-green-200"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Debug信息区域 */}
                <div className="mt-6">
                  <button
                      onClick={() => setShowDebugInfo(!showDebugInfo)}
                      className="w-full py-2 px-4 rounded-lg text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-all"
                  >
                    {showDebugInfo ? '隐藏调试信息' : '显示调试信息'}
                  </button>

                  {showDebugInfo && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                        <div className="mb-2">
                          <div className="text-gray-700 font-medium mb-1">设备信息</div>
                          <div className="grid grid-cols-2 gap-1">
                            <div className="text-gray-500">MAC:</div>
                            <div className="text-gray-800 truncate">{deviceMac}</div>
                            <div className="text-gray-500">客户端ID:</div>
                            <div className="text-gray-800 truncate">{clientId}</div>
                          </div>
                        </div>
                        <div className="mb-2">
                          <div className="text-gray-700 font-medium mb-1">设备ID</div>
                          <input
                            type="text"
                            value={deviceId}
                            onChange={(e) => setDeviceId(e.target.value)}
                            className="w-full px-2 py-1 rounded border border-gray-300 text-xs bg-white"
                            placeholder="输入设备ID..."
                          />
                        </div>
                        <div className="mb-2">
                          <div className="text-gray-700 font-medium mb-1">连接状态</div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">OTA:</span>
                              <span className={otaOk ? 'text-green-600' : 'text-red-600'}>{otaOk ? '已连接' : '未连接'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">WS:</span>
                              <span className={wsOk ? 'text-green-600' : 'text-red-600'}>{wsOk ? '已连接' : '未连接'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Opus:</span>
                              <span className={opusReady ? 'text-green-600' : 'text-orange-600'}>{opusReady ? '已加载' : '加载中...'}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-700 font-medium mb-1">服务器URL</div>
                          <div className="text-gray-800 truncate bg-white p-1 rounded border border-gray-200">
                            {serverUrl || '未连接'}
                          </div>
                        </div>
                      </div>
                  )}
                </div>
              </div>
            </div>
        )}

        {/* 主聊天界面 */}
        {!showUserIdModal && (
            <div className="max-w-4xl mx-auto bg-white rounded-3xl overflow-hidden shadow-xl border-2 border-purple-200">
              {/* 头部导航 */}
              <header className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 md:p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold">
                      阿派朗智能助手
                      {npcInfo?.name && <span className="ml-2 text-base">{npcInfo.name}</span>}
                    </h1>
                    <p className="text-sm opacity-80">与 {userId} 对话中</p>
                  </div>
                </div>
                <button
                    onClick={endConversation}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 transition-all px-4 py-2 rounded-full text-sm font-medium"
                >
                  结束对话
                </button>
              </header>

              {/* 聊天内容区 */}
              <main className="p-4 md:p-6 h-[calc(100vh-220px)] md:h-[calc(100vh-250px)] overflow-y-auto bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNnptMCAzMGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNnptLTE4LTE4YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDIuNjg2IDYgNiA2em0wIDMGMzMuMzE0IDAgMzYgMi42ODYgMzYgNnMtMi42ODYgNi02IDYtNi0yLjY4Ni02LTYgMi42ODYtNiA2LTZ6bTE4IDBjMy4zMTQgMCA2LTIuNjg2IDYtNnMtMi42ODYtNi02LTYtNiAyLjY4Ni02IDYgMi42ODYgNiA2IDZ6bS0zNiAxOGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNnptMTggMzBjMy4zMTQgMCA2LTIuNjg2IDYtNnMtMi42ODYtNi02LTYtNiAyLjY4Ni02IDYgMi42ODYgNiA2IDZ6bTE4LTE4YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDIuNjg2IDYgNiA2em0wIDBIMHY2MGgzNnYwSDB6bTE4IDE4VjBIMHYxOEgzNnoiLz48L2c+PC9zdmc+')] bg-repeat">
                <div className="space-y-4">
                  {conversation.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <div className="mb-4 inline-block">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        </div>
                        <p>点击下方麦克风开始和阿派朗智能助手聊天吧！</p>
                      </div>
                  ) : (
                      conversation.map((msg, index) => (
                          <div key={index} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] ${msg.isUser ? 'mr-2' : 'ml-2'}`}>
                              <div className={`${msg.isUser ? 'bg-blue-100' : 'bg-white'} p-3 md:p-4 rounded-2xl shadow-sm border ${msg.isUser ? 'border-blue-200 rounded-br-none' : 'border-gray-200 rounded-bl-none'}`}>
                                <p className="text-gray-800 whitespace-pre-wrap">{msg.text}</p>
                              </div>
                              <div className={`text-xs text-gray-400 mt-1 ${msg.isUser ? 'text-right' : 'text-left'}`}>
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                      ))
                  )}
                  <div ref={conversationEndRef} />
                </div>
              </main>

              {/* 底部输入区 */}
              <footer className="p-4 border-t border-gray-100 bg-gradient-to-t from-white to-gray-50">
                <div className="flex items-center justify-between space-x-3">
                  <div className="flex-1">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendText()}
                        className="w-full px-4 py-3 rounded-full border-2 border-purple-200 focus:border-purple-400 focus:outline-none transition-all bg-white shadow-sm"
                        placeholder="输入消息..."
                    />
                  </div>
                  <button
                      onClick={toggleRecording}
                      disabled={!wsOk}
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-purple-500 text-white hover:bg-purple-600'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {isRecording ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                      ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      )}
                    </svg>
                  </button>
                </div>
                {isRecording && (
                    <div className="mt-3 bg-red-50 p-2 rounded-lg border border-red-100">
                      <div className="flex items-center text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">录音中，请说话...</span>
                      </div>
                    </div>
                )}
              </footer>
            </div>
        )}
      </div>
  );
}

function genMac() {
  const hex = '0123456789ABCDEF';
  const parts = Array.from({length:6}, ()=> hex[Math.floor(Math.random()*16)] + hex[Math.floor(Math.random()*16)]);
  return parts.join(':');
}