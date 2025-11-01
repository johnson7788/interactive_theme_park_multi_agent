'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import { connectViaOTA } from '@/lib/xiaoZhiConnect';
import { initOpusEncoder, checkOpusLoaded, type OpusEncoderHandle, createOpusDecoder } from '@/lib/opus';
import { createStreamingContext, StreamingContext } from '@/lib/StreamingContext';
import BlockingQueue from '@/lib/BlockingQueue';

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
  const [otaUrl, setOtaUrl] = useState<string>('http://127.0.0.1:8002/xiaozhi/ota/');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [deviceMac, setDeviceMac] = useState<string>('');
  const [deviceName, setDeviceName] = useState('Web测试设备');
  const [clientId, setClientId] = useState('web_test_client');
  const [token, setToken] = useState('your-token1');

  // 客户端初始化localStorage
  useEffect(() => {
    setOtaUrl(localStorage.getItem('otaUrl') || 'http://127.0.0.1:8002/xiaozhi/ota/');
    setDeviceMac(localStorage.getItem('deviceMac') || genMac());
  }, []);

  const [otaOk, setOtaOk] = useState(false);
  const [wsOk, setWsOk] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [opusReady, setOpusReady] = useState(false);

  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const vizIdRef = useRef<number | null>(null);

  const queueRef = useRef(new BlockingQueue<Uint8Array>());
  const streamingRef = useRef<StreamingContext | null>(null);
  const opusDecoderRef = useRef<ReturnType<typeof createOpusDecoder> | null>(null);
  const opusEncoderRef = useRef<OpusEncoderHandle | null>(null);

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
    setConversation(prev => [...prev, (isUser ? '👉 ' : '🟩 ') + text]);
  };

  useEffect(() => {
    localStorage.setItem('deviceMac', deviceMac);
  }, [deviceMac]);

  useEffect(() => {
    localStorage.setItem('otaUrl', otaUrl);
  }, [otaUrl]);

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
  const [showConfig, setShowConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<'text'|'voice'>('text');

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      {/* 加载 libopus.js */}
      <Script src="/libopus.js" strategy="afterInteractive" onLoad={handleOpusReady} onError={(e) => log('libopus.js 加载失败', 'error')} />

      <h1 className="text-2xl font-bold mb-3">服务器测试页面 (Next.js)</h1>

      <div className="text-sm text-gray-700 mb-4">
        <span>OTA: <b className={otaOk ? 'text-green-600' : 'text-red-600'}>{otaOk ? 'ota已连接' : 'ota未连接'}</b></span>
        <span className="ml-4">WS: <b className={wsOk ? 'text-green-600' : 'text-red-600'}>{wsOk ? 'ws已连接' : 'ws未连接'}</b></span>
        <span className="ml-4">Opus: <b className={opusReady ? 'text-green-600' : 'text-orange-600'}>{opusReady ? '已加载' : '加载中...'}</b></span>
      </div>

      <section className="border rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            设备配置
            <span className="ml-3 text-sm text-gray-500">
              MAC: <b>{deviceMac}</b>　客户端: <b>{clientId}</b>
            </span>
          </h2>
          <button className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200" onClick={() => setShowConfig(s => !s)}>
            {showConfig ? '收起' : '编辑'}
          </button>
        </div>

        {showConfig && (
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <label className="text-sm">设备MAC
              <input className="border rounded w-full px-2 py-1" value={deviceMac} onChange={e=>setDeviceMac(e.target.value)} />
            </label>
            <label className="text-sm">设备名称
              <input className="border rounded w-full px-2 py-1" value={deviceName} onChange={e=>setDeviceName(e.target.value)} />
            </label>
            <label className="text-sm">客户端ID
              <input className="border rounded w-full px-2 py-1" value={clientId} onChange={e=>setClientId(e.target.value)} />
            </label>
            <label className="text-sm">认证Token
              <input className="border rounded w-full px-2 py-1" value={token} onChange={e=>setToken(e.target.value)} />
            </label>
          </div>
        )}
      </section>

      <section className="border rounded-xl p-4 mb-4">
        <h2 className="text-lg font-semibold mb-3">连接信息</h2>
        <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
          <input className="border rounded px-2 py-1" value={otaUrl} onChange={e=>setOtaUrl(e.target.value)} placeholder="OTA 服务器地址" />
          <input className="border rounded px-2 py-1" value={serverUrl} readOnly disabled placeholder="点击连接后自动从 OTA 获取" />
          {!wsOk ? (
            <button className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50" disabled={connecting} onClick={connect}>
              {connecting ? '连接中...' : '连接'}
            </button>
          ) : (
            <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={disconnect}>断开</button>
          )}
        </div>
      </section>

      <section className="border rounded-xl p-4 mb-4">
        <div className="flex gap-2 mb-3">
          <button className={`px-3 py-1 rounded ${activeTab==='text'?'bg-blue-600 text-white':'bg-gray-100'}`} onClick={()=>setActiveTab('text')}>文本消息</button>
          <button className={`px-3 py-1 rounded ${activeTab==='voice'?'bg-blue-600 text-white':'bg-gray-100'}`} onClick={()=>setActiveTab('voice')}>语音消息</button>
        </div>

        {activeTab==='text' ? (
          <div className="flex gap-2">
            <input className="border rounded px-2 py-1 flex-1" placeholder="输入消息..." value={message} onChange={e=>setMessage(e.target.value)} disabled={!wsOk} onKeyDown={e=>{ if(e.key==='Enter') sendText(); }} />
            <button className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50" onClick={sendText} disabled={!wsOk}>发送</button>
          </div>
        ) : (
          <div>
            <div className="flex gap-2 items-center mb-3">
              {!isRecording ? (
                <button className="px-3 py-2 rounded bg-emerald-600 text-white disabled:opacity-50" onClick={startRecording} disabled={!wsOk}>开始录音</button>
              ) : (
                <button className="px-3 py-2 rounded bg-rose-600 text-white" onClick={stopRecording}>停止录音</button>
              )}
              <span className="text-sm text-gray-500">{isRecording ? '录音中...' : '待机'}</span>
            </div>
            <canvas ref={canvasRef} className="w-full h-32 border rounded" />
          </div>
        )}
      </section>

      <section className="border rounded-xl p-4 mb-4">
        <h2 className="text-lg font-semibold mb-3">会话记录</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border rounded p-2 h-64 overflow-auto text-sm bg-gray-50">
            {conversation.map((m,i)=>(
              <div key={i} className="mb-1 whitespace-pre-wrap">{m}</div>
            ))}
          </div>
          <div className="border rounded p-2 h-64 overflow-auto text-xs bg-gray-50">
            {logs.map((l,i)=>(
              <div key={i} className="whitespace-pre">{l}</div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function genMac() {
  const hex = '0123456789ABCDEF';
  const parts = Array.from({length:6}, ()=> hex[Math.floor(Math.random()*16)] + hex[Math.floor(Math.random()*16)]);
  return parts.join(':');
}
