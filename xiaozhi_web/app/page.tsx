'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { connectViaOTA } from '@/lib/xiaoZhiConnect';
import { initOpusEncoder, checkOpusLoaded, type OpusEncoderHandle, createOpusDecoder } from '@/lib/opus';
import { createStreamingContext, StreamingContext } from '@/lib/StreamingContext';
import BlockingQueue from '@/lib/BlockingQueue';
import {
  getUserByName,
  getNPCById,
  getCurrentDeviceNPC,
  bulkInsertNpcChatLogs,
  NpcChatLog,
  getUserById,
  getDialogueHistory,
  getAllNPCs,
  getMergedDialogueHistory,
  type NPC,
  type Dialogue
} from '@/lib/supabase';
import { useAdvancedVad, VadState } from '@/hooks/use-advanced-vad';
import { VADIndicator } from '@/components/voice-chat/VADIndicator';

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
  const [userId, setUserId] = useState('3d1b19a5-07a3-4a83-a1e9-33d7c0672c4f');
  const [showUserIdModal, setShowUserIdModal] = useState(true);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  // 从环境变量读取设备ID
  const [deviceId, setDeviceId] = useState<string>(process.env.NEXT_PUBLIC_NPC_DEVICE_ID || '');
  // 新增NPC信息状态
  const [npcInfo, setNpcInfo] = useState<any>(null);
  // NPC列表状态
  const [npcList, setNpcList] = useState<NPC[]>([]);
  const [loadingNPCs, setLoadingNPCs] = useState(false);
  // 电话相关状态
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState('');
  
  // 初始化VAD检测
  const { vadState, isSpeechDetected, startVad, stopVad, error: vadError, currentVadStateRef } = useAdvancedVad({
    sampleRate: SAMPLE_RATE,
    threshold: 0.3, // 调整阈值到0.3，平衡灵敏度和准确性
    minSpeechFrames: 3, // 减少最小语音帧数，提高响应速度
    minSilenceFrames: 5, // 适当减少最小静音帧数，提高响应速度
    onSpeechEndCallback: () => {
      console.log('VAD检测到语音结束');
      
      // 更新对话状态
      setConversationState(prev => ({
        ...prev,
        isProcessingASR: true,
        vadState: VadState.SILENCE
      }));
      
      sendVoiceData();
    },
    onSpeechStartCallback: () => {
      console.log('VAD检测到语音开始, 监听状态：', isListeningRef.current);

      // 更新对话状态
      setConversationState(prev => ({
        ...prev,
        vadState: VadState.SPEECH_DETECTED
      }));

      // 如果当前没有在录音，开始语音监听
      // 使用ref中的最新状态值，而不是直接使用state
      if (!isListeningRef.current) {
        startVoiceListening();
      }
    },
  });
  
  // 打电话功能
  const startCall = async () => {
    if (!userId) {
      alert('请先输入您的名字');
      return;
    }
    
    setIsCalling(true);
    setCallStatus('正在连接...');
    
    try {
      // 首先检查是否已经连接OTA和WebSocket
      if (!otaOk || !wsOk) {
        setCallStatus('正在连接服务器...');
        await connect();
        
        // 等待连接建立
        let attempts = 0;
        while ((!otaOk || !wsOk) && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!otaOk || !wsOk) {
          throw new Error('服务器连接超时，请检查网络连接');
        }
      }
      
      // 启动VAD检测
      await startVad();
      
      // 检查VAD状态 - 等待VAD初始化完成
      let vadAttempts = 0;
      let currentVadState = vadState;
      
      // 使用函数获取最新的VAD状态，而不是直接使用变量
      const getCurrentVadState = () => {
        return currentVadStateRef.current;
      };
      
      // 等待VAD初始化完成（包括INITIALIZING状态）
      while (((currentVadState === VadState.NOT_INITIALIZED) || (currentVadState === VadState.INITIALIZING)) && vadAttempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        vadAttempts++;
        currentVadState = getCurrentVadState(); // 每次循环都获取最新状态
        
        // 记录调试信息
        log(`VAD初始化检查: 尝试 ${vadAttempts}/50, 当前状态: ${currentVadState}`, 'debug');
        
        // 如果状态变为就绪状态，提前退出循环
        if (currentVadState === VadState.READY || currentVadState === VadState.SILENCE || currentVadState === VadState.SPEECH_DETECTED) {
          log(`VAD已就绪，当前状态: ${currentVadState}`, 'debug');
          break;
        }
      }
      
      if (currentVadState === VadState.ERROR) {
        const errorMsg = vadError || 'VAD初始化失败';
        log(`VAD初始化错误: ${errorMsg}`, 'error');
        throw new Error(errorMsg);
      }
      
      if (currentVadState !== VadState.READY && currentVadState !== VadState.SILENCE && currentVadState !== VadState.SPEECH_DETECTED) {
        const errorMsg = `VAD初始化超时 (${vadAttempts * 100}ms)，请检查麦克风权限。最终状态: ${currentVadState}`;
        log(errorMsg, 'error');
        throw new Error(errorMsg);
      }
      
      // 记录VAD初始化成功
      log(`VAD初始化成功，当前状态: ${currentVadState}`, 'success');
      
      // 设置通话状态
      setCallStatus('通话中...');
      
      // 初始化对话状态
      setConversationState(prev => ({
        ...prev,
        isListening: false, // 初始时不处于监听状态，等待VAD检测到语音后才开始监听
        isSpeaking: false,
        vadState: currentVadState, // 使用当前的VAD状态
        isProcessingASR: false
      }));

      // 可以在这里触发与NPC的对话
      addMessage('您好！我是阿派朗智能助手，很高兴为您服务。', false);
      
      // 记录通话开始时间
      log('VAD连续对话通话已开始，等待语音输入...', 'success');

    } catch (error) {
      console.error('启动电话失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setCallStatus(`连接失败: ${errorMessage}`);
      setIsCalling(false);
      
      // 如果VAD初始化失败，显示详细错误信息
      if (errorMessage.includes('Audio context') || errorMessage.includes('VAD')) {
        alert(`语音检测初始化失败: ${errorMessage}\n\n请确保：\n1. 浏览器支持Web Audio API\n2. 已授予麦克风权限\n3. 页面通过HTTPS访问`);
      }
    }
  };

  const endCall = async () => {
    setIsCalling(false);
    setCallStatus('');
    
    // 停止VAD检测
    stopVad();
    
    // 停止语音监听
    stopVoiceListening();
    
    // 重置对话状态
    setConversationState(prev => ({
      ...prev,
      isListening: false,
      isSpeaking: false,
      vadState: VadState.NOT_INITIALIZED,
      isProcessingASR: false,
      audioBuffers: []
    }));
    
    // 记录通话结束
    log('VAD连续对话通话已结束', 'info');
    
    // 添加通话结束消息
    addMessage('通话已结束，感谢您的使用！', false);
    
    // 批量存储聊天记录
    try {
      if (conversation.length > 0 && userId && deviceId) {
        // 转换对话记录格式
        const chatLogs = conversation
          .filter(msg => msg.text && msg.text.trim()) // 过滤空消息
          .map(msg => ({
            npc_id: deviceId,
            user_id: userId,
            message_content: msg.text || '',
            sender_type: msg.isUser ? 'user' : 'npc',
            session_id: conversationState.sessionId || crypto.randomUUID()
          })) as Omit<NpcChatLog, 'id' | 'created_at'>[];
        
        log(`准备批量存储 ${chatLogs.length} 条聊天记录`, 'debug');
        
        // 调用批量存储函数
        const result = await bulkInsertNpcChatLogs(chatLogs);
        
        if (result) {
          log(`成功批量存储 ${result.length} 条聊天记录`, 'success');
          
          // 保存成功后，更新本地存储，确保切换NPC时能立即看到
          try {
            const dialogueHistory: Dialogue[] = result.map(log => ({
              id: log.id,
              user_id: log.user_id,
              npc_id: log.npc_id,
              message: log.message_content,
              is_npc: log.sender_type === 'npc',
              created_at: log.created_at
            }));
            const key = `chat_history_${userId}_${deviceId}`;
            localStorage.setItem(key, JSON.stringify(dialogueHistory));
            log('已更新本地对话历史缓存', 'debug');
          } catch (error) {
            console.error('更新本地缓存失败:', error);
          }
        } else {
          log('批量存储聊天记录失败', 'error');
        }
      }
    } catch (error) {
      console.error('批量存储聊天记录时发生错误:', error);
      log(`批量存储聊天记录时发生错误: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    }
  };
  
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

  const [conversation, setConversation] = useState<Array<{text: string, isUser: boolean, timestamp: Date}>>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  
  // 对话状态管理 - 用于VAD连续对话
  const [conversationState, setConversationState] = useState({
    isListening: false,
    isSpeaking: false,
    lastUserInput: '',
    asrConfidence: 0,
    listeningStartTime: null as number | null,
    lastVoiceTime: 0,
    audioBuffers: [] as Uint8Array[],
    vadState: VadState.NOT_INITIALIZED,
    lastASRResult: '',
    isProcessingASR: false,
    listeningDuration: 0,
    lastAudioSentTime: 0,
    sessionId: ''
  });

  // 使用ref来保存最新的isListening状态，以便在回调中立即访问
  const isListeningRef = useRef(false);
  const audioBuffersRef = useRef<Uint8Array[]>([]);
  // 监听isListening状态的变化
  useEffect(() => {
    isListeningRef.current = conversationState.isListening;
  }, [conversationState.isListening]);
  
  // 监听audioBuffers状态的变化
  useEffect(() => {
    audioBuffersRef.current = conversationState.audioBuffers;
  }, [conversationState.audioBuffers]);

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

  // 加载所有NPC列表
  useEffect(() => {
    const loadNPCList = async () => {
      setLoadingNPCs(true);
      try {
        const npcs = await getAllNPCs();
        setNpcList(npcs);
        log(`已加载 ${npcs.length} 个NPC角色`, 'info');
      } catch (error) {
        console.error('加载NPC列表失败:', error);
      } finally {
        setLoadingNPCs(false);
      }
    };
    loadNPCList();
  }, []);

  // 根据设备ID获取NPC信息，并加载对话历史
  useEffect(() => {
    const fetchNpcInfo = async () => {
      if (deviceId) {
        try {
          const npc = await getNPCById(deviceId);
          if (npc) {
            setNpcInfo(npc);
            // 如果已登录用户，加载该用户的跨NPC合并历史
            if (userId) {
              try {
                const history = await getMergedDialogueHistory(userId);
                const formattedMessages = history.map(msg => ({
                  text: msg.message,
                  isUser: !msg.is_npc,
                  timestamp: new Date(msg.created_at)
                }));
                setConversation(formattedMessages);
                if (history.length > 0) {
                  log(`已加载合并历史 ${history.length} 条`, 'info');
                } else {
                  log('该用户暂无历史对话记录，开始新的对话', 'info');
                }
              } catch (error) {
                console.error('加载对话历史失败:', error);
                // 出错时也清空对话，避免显示错误的历史
                setConversation([]);
              }
            } else {
              // 未登录时清空对话
              setConversation([]);
            }
          }
        } catch (error) {
          console.error('获取NPC信息失败:', error);
          setConversation([]);
        }
      } else {
        // 如果没有提供特定的deviceId，使用当前设备默认的NPC
        try {
          const npc = await getCurrentDeviceNPC();
          if (npc) {
            setNpcInfo(npc);
            // 如果已登录用户，加载该用户的跨NPC合并历史
            if (userId && npc.id) {
              try {
                const history = await getMergedDialogueHistory(userId);
                const formattedMessages = history.map(msg => ({
                  text: msg.message,
                  isUser: !msg.is_npc,
                  timestamp: new Date(msg.created_at)
                }));
                setConversation(formattedMessages);
                if (history.length > 0) {
                  log(`已加载合并历史 ${history.length} 条`, 'info');
                } else {
                  log('该用户暂无历史对话记录，开始新的对话', 'info');
                }
              } catch (error) {
                console.error('加载对话历史失败:', error);
                setConversation([]);
              }
            } else {
              setConversation([]);
            }
          }
        } catch (error) {
          console.error('获取默认NPC信息失败:', error);
          setConversation([]);
        }
      }
    };

    fetchNpcInfo();
  }, [deviceId, userId]);

  // 自动连接OTA（当页面加载且有用户信息时）
  useEffect(() => {
    const autoConnectOTA = async () => {
      // 检查是否有保存的用户信息
      const savedUserId = localStorage.getItem('userId');
      const savedChildInfo = localStorage.getItem('childInfo');
      
      if (savedUserId && savedChildInfo && !showUserIdModal) {
        try {
          // 设置用户信息
          setUserId(savedUserId);
          setChildInfo(JSON.parse(savedChildInfo));
          
          // 延迟连接，确保组件完全加载
          setTimeout(() => {
            connect();
          }, 1000);
        } catch (error) {
          console.error('自动连接OTA失败:', error);
        }
      }
    };

    // 页面加载后自动连接
    autoConnectOTA();
  }, [showUserIdModal]);

  // 用户ID输入处理
  const handleUserIdSubmit = async () => {
    if (userId.trim()) {
      try {
        // 先清空之前的错误信息
        setShowError(false);
        // 设置加载中状态
        setIsLoading(true);
        
        // 根据用户名查询小朋友信息
        const userInfo = await getUserById(userId.trim());
        
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
      // 使用 deviceId（NPC ID）作为设备标识，如果没有设置则使用 deviceMac
      const actualDeviceId = deviceId || deviceMac;
      const cfg = {
        deviceId: actualDeviceId,
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

        endConversation();
      };

      ws.onerror = (ev: any) => {
        log(`WS 错误: ${ev?.message || '未知错误'}`, 'error');
      };

      ws.onmessage = async (ev) => {
        try {
          console.log("收到消息:", ev.data);
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
                if (m.text) {
                  // 处理ASR结果
                  handleASRResult(m.text);
                  
                  // 记录ASR结果
                  log(`收到语音识别结果: ${m.text}`, 'info');
                  
                  // 如果当前正在处理ASR，更新状态
                  if (conversationState.isProcessingASR) {
                    setConversationState(prev => ({
                      ...prev,
                      isProcessingASR: false,
                      lastASRResult: m.text || ''
                    }));
                  }
                }
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

  // 文本发送功能已移除，只保留电话功能

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
  
  // 直接注册处理器，避免重复注册检查
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
    
    try {
      log('开始录音初始化...', 'info');
      
      // 初始化Opus编码器
      if (!opusEncoderRef.current) {
        opusEncoderRef.current = initOpusEncoder({
          sampleRate: SAMPLE_RATE, channels: CHANNELS, frameSize: FRAME_SIZE,
          onLog: (m,l) => log(m, l as any)
        });
        if (!opusEncoderRef.current) {
          log('Opus 编码器初始化失败', 'error'); return;
        }
        log('Opus编码器初始化完成', 'success');
      }
      
      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true, 
          sampleRate: 16000, 
          channelCount: 1
        }
      });
      log('麦克风权限获取成功', 'success');
      
      const ctx = ensureAudioContext();
      const src = ctx.createMediaStreamSource(stream);

      // 可视化链路
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 2048;
      src.connect(analyserRef.current);
      
      // 录音处理节点
      try {
        // 预注册 AudioWorkletProcessor
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
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(encoded.buffer);
                  
                  // 记录发送的音频数据到状态中
                  setConversationState(prev => ({
                    ...prev,
                    audioBuffers: [...prev.audioBuffers, encoded],
                    lastAudioSentTime: Date.now()
                  }));
                }
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
        const currentTime = Date.now();
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ 
            type:'listen', 
            mode:'manual', 
            state:'start',
            timestamp: currentTime,
            session_id: conversationState.sessionId 
          }));
          log('录音开始消息已发送', 'info');
        }
        node.port.postMessage({ command: 'start' });

        setIsRecording(true);
        // 启动可视化
        if (canvasRef.current) {
          canvasRef.current.width = canvasRef.current.clientWidth;
          canvasRef.current.height = canvasRef.current.clientHeight;
        }
        vizIdRef.current = requestAnimationFrame(draw);
        
        // 更新对话状态
        setConversationState(prev => ({
          ...prev,
          isListening: true,
          listeningStartTime: currentTime,
          audioBuffers: [],
          vadState: VadState.SPEECH_DETECTED
        }));
        
        log('录音已开始', 'success');

        // 把 node 存起来以便 stop
        (window as any).__recNode = node;
      } catch (error: any) {
        log(`AudioWorklet 不可用: ${error.message}，请升级浏览器或使用回退方案（略）`, 'warning');
      }
    } catch (error) {
      log(`开始录音失败: ${error}`, 'error');
      // 出错时重置状态
      setConversationState(prev => ({
        ...prev,
        isListening: false,
        vadState: VadState.ERROR
      }));
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    
    try {
      // 停止录音
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

      // 延迟100ms发送空帧，确保缓冲数据被处理
      setTimeout(() => {
        try {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            // 发送监听结束消息
            const stopMessage = {
              type: 'listen',
              mode: 'manual',
              state: 'stop',
              timestamp: Date.now(),
              session_id: conversationState.sessionId
            };
            
            wsRef.current.send(JSON.stringify(stopMessage));
            log('已发送录音停止信号', 'info');
          }
        } catch (error) {
          log(`发送录音停止信号失败: ${error}`, 'error');
        }
      }, 100);

      // 更新对话状态
      const currentTime = Date.now();
      const listeningDuration = conversationState.listeningStartTime ? 
        currentTime - conversationState.listeningStartTime : 0;
      
      setConversationState(prev => ({
        ...prev,
        isListening: false,
        listeningDuration,
        lastVoiceTime: currentTime,
        vadState: VadState.SILENCE
      }));

      log(`录音已停止，录音时长: ${listeningDuration}ms`, 'success');
      
    } catch (error) {
      log(`停止录音失败: ${error}`, 'error');
      // 出错时重置状态
      setConversationState(prev => ({
        ...prev,
        isListening: false,
        vadState: VadState.ERROR
      }));
    }

    // 注意：不销毁编码器，因为是单例，可以复用
  };

  // 发送缓冲的音频数据到WebSocket
  const sendBufferedAudio = async (audioBuffers: Uint8Array[] = []) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      log('WebSocket未连接，无法发送音频数据', 'warning');
      return false;
    }

    if (!audioBuffers || audioBuffers.length === 0) {
      log('没有要发送的音频数据', 'info');
      return true;
    }

    try {
      log(`准备发送 ${audioBuffers.length} 帧音频数据`, 'info');
      
      // 创建一个包含所有音频帧的新数组，避免在循环中修改原始数组
      const buffersToSend = [...audioBuffers];
      
      // 设置一个最大尝试次数，避免无限循环
      const MAX_RETRIES = 3;
      let retries = 0;
      let allSent = true;
      
      for (let i = 0; i < buffersToSend.length; i++) {
        const buffer = buffersToSend[i];
        if (!buffer || buffer.length === 0) {
          log(`跳过空的音频帧 #${i}`, 'debug');
          continue;
        }

        let frameSent = false;
        retries = 0;
        
        while (!frameSent && retries < MAX_RETRIES) {
          try {
            // 优先使用二进制方式发送
            wsRef.current.send(buffer);
            log(`音频帧 #${i} 发送成功（长度: ${buffer.length}字节）`, 'debug');
            frameSent = true;
          } catch (error: any) {
            retries++;
            log(`音频帧 #${i} 二进制发送失败 (${error?.message})，尝试第${retries}次base64编码发送`, 'warning');
            
            try {
              // 将Uint8Array转换为base64
              const base64String = arrayBufferToBase64(buffer.buffer as ArrayBuffer);
              if (base64String) {
                const base64Message = {
                  type: 'audio_chunk',
                  data: base64String,
                  index: i,
                  total: buffersToSend.length
                };
                wsRef.current.send(JSON.stringify(base64Message));
                log(`音频帧 #${i} base64编码发送成功`, 'info');
                frameSent = true;
              } else {
                log(`音频帧 #${i} base64编码失败`, 'error');
              }
            } catch (base64Error) {
              log(`音频帧 #${i} base64编码发送也失败: ${base64Error}`, 'error');
            }
            
            if (!frameSent && retries < MAX_RETRIES) {
              // 等待短暂时间后重试
              await new Promise(resolve => setTimeout(resolve, 20));
            }
          }
        }
        
        if (!frameSent) {
          log(`音频帧 #${i} 发送失败，已达到最大重试次数`, 'error');
          allSent = false;
        }
        
        // 为了避免发送过快导致网络拥塞，添加小延迟
        if (i < buffersToSend.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      // 只有当所有帧都发送成功时才清空缓冲区
      log('所有音频帧发送完成', 'success');

      return allSent;
    } catch (error: any) {
      log(`发送缓冲音频数据失败: ${error?.message || error}`, 'error');
      return false;
    }
  };

  // base64 编码工具函数
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // 发送语音数据函数
  const sendVoiceData = async () => {
    log('开始发送语音数据...', 'info');
    
    // 1. 确保WebSocket连接已建立
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      log('WebSocket 未连接，尝试重新连接...', 'warning');
      // 如果WebSocket未连接，尝试连接
      if (!connecting) {
        await connect();
      }
      // 再次检查连接状态
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        log('连接失败，无法继续语音发送流程', 'error');
        // 出错时重置状态
        setConversationState(prev => ({
          ...prev,
          isSpeaking: false,
          listeningStartTime: null,
          vadState: VadState.ERROR
        }));
        return;
      }
    }
    
    try {
      // 2. 获取缓冲区数据
      const currentBuffers = [...audioBuffersRef.current]; // 创建副本
      // 清空原始缓冲区，确保新的语音不会混入旧数据
      audioBuffersRef.current = [];

      if (currentBuffers.length === 0) {
        log('没有录制到有效音频，发送空消息', 'warning');
        
        // 直接调用completeVoiceDataSending完成发送
        completeVoiceDataSending();
        return;
      }
      
      // 3. 发送缓冲的音频数据
      const sendSuccess = await sendBufferedAudio(currentBuffers);
      
      // 4. 发送结束标志
      if (sendSuccess) {
        completeVoiceDataSending();
      } else {
        log('部分音频帧发送失败，仍尝试发送结束消息', 'warning');
        completeVoiceDataSending();
      }
    } catch (error) {
      log(`发送语音数据过程中发生错误: ${error}`, 'error');
      // 出错时重置状态
      setConversationState(prev => ({
        ...prev,
        isSpeaking: false,
        listeningStartTime: null,
        vadState: VadState.ERROR
      }));
    }
  };

  // 完成语音数据发送的辅助函数
  const completeVoiceDataSending = () => {
    try {
      // 计算录音时长
      const currentTime = Date.now();
      const listeningDuration = conversationState.listeningStartTime ?
        currentTime - conversationState.listeningStartTime : 0;

      // 发送一个空的消息作为结束标志 - 这是标准方式
      const emptyOpusFrame = new Uint8Array(0);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(emptyOpusFrame);
        log('结束帧发送成功', 'info');
      }

      // 发送语音结束标记
      const stopMessage = {
        type: 'listen',
        mode: 'manual',
        state: 'stop',
        timestamp: currentTime,
        session_id: conversationState.sessionId,
        audio_count: conversationState.audioBuffers.length
      };

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(stopMessage));
        log('已发送语音结束标记', 'info');
      }

      // 更新对话状态
      setConversationState(prev => ({
        ...prev,
        isSpeaking: false,
        listeningStartTime: null,
        listeningDuration,
        vadState: VadState.SILENCE,
        isProcessingASR: false,
        lastVoiceTime: currentTime,
        audioBuffers: []
      }));

      log(`语音数据发送完成，录音时长: ${listeningDuration}ms`, 'success');

    } catch (error) {
      log(`完成语音数据发送时出错: ${error}`, 'error');
    }
  };
  // 处理ASR结果
  const handleASRResult = (text: string) => {
    log(`识别结果: ${text}`, 'info');

    if (!text || text.trim() === '') return;

    // 更新对话状态
    setConversationState(prev => ({
      ...prev,
      lastASRResult: text,
      isProcessingASR: false
    }));
    
    // 添加识别结果到会话记录
    addMessage(text, true);

  };

  // 开始语音监听
  const startVoiceListening = async () => {
    if (conversationState.isListening || isRecording) {
      log('语音监听或录音已在进行中', 'info');
      return;
    }

    try {
      // 更新对话状态
      setConversationState(prev => ({ 
        ...prev, 
        isListening: true, 
        listeningStartTime: Date.now(), 
        vadState: VadState.SPEECH_DETECTED, 
        audioBuffers: [] // 清空之前的缓冲区
      }));

      log('语音监听已开始', 'success');
      
      // 初始化Opus编码器
      if (!opusEncoderRef.current) {
        opusEncoderRef.current = initOpusEncoder({
          sampleRate: SAMPLE_RATE, channels: CHANNELS, frameSize: FRAME_SIZE,
          onLog: (m,l) => log(m, l as any)
        });
        if (!opusEncoderRef.current) {
          log('Opus编码器初始化失败', 'error');
          return;
        }
        log('Opus编码器初始化完成', 'success');
      }
      
      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          autoGainControl: true
        }
      });
      log('麦克风权限获取成功', 'success');
      
      const ctx = ensureAudioContext();
      const src = ctx.createMediaStreamSource(stream);

      // 可视化链路
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 2048;
      src.connect(analyserRef.current);
      
      // 使用统一的处理方式，优先使用AudioWorklet
      try {
        // 预注册 AudioWorkletProcessor
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
                // 缓冲音频数据
                audioBuffersRef.current.push(encoded); // FIX: 立即更新 ref，确保数据完整性

                setConversationState(prev => ({ 
                  ...prev, 
                  lastAudioSentTime: Date.now() // 仅更新时间/其他属性，避免大数组频繁触发状态更新
                }));
              }
            } catch (err:any) {
              log(`Opus 编码错误: ${err?.message || err}`, 'error');
            }
          }
        };
        // 需要有输出以触发处理（静音增益）
        const silent = ctx.createGain();
        silent.gain.value = 0;
        node.connect(silent); 
        silent.connect(ctx.destination);

        src.connect(node);
        (node as any).__src = src;  // 保存引用，stop 时断开

        // 保存引用以便停止时断开连接
        (window as any).__voiceProcessor = node;
        (window as any).__voiceSource = src;
        
        // 发送监听开始消息
        const currentTime = Date.now();
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const startMessage = {
            type:'listen',
            mode:'manual',
            state:'start',
            timestamp: currentTime,
            session_id: conversationState.sessionId
          };
          wsRef.current.send(JSON.stringify(startMessage));
          log('语音监听开始消息已发送', 'info');
        }
        node.port.postMessage({ command: 'start' });

        // 启动可视化
        if (canvasRef.current) {
          canvasRef.current.width = canvasRef.current.clientWidth;
          canvasRef.current.height = canvasRef.current.clientHeight;
        }
        vizIdRef.current = requestAnimationFrame(draw);
        
      } catch (error: any) {
        // 回退到ScriptProcessor
        log(`AudioWorklet 不可用: ${error.message}，使用ScriptProcessor回退方案`, 'warning');
        
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (event) => {
          if (!conversationState.isListening) return;
          
          const inputData = event.inputBuffer.getChannelData(0);
          
          // 转换为Int16Array
          const int16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            int16Data[i] = Math.max(-32768, Math.min(32767, Math.floor(inputData[i] * 32767)));
          }
          
          // 编码为Opus
          if (opusEncoderRef.current) {
            try {
              const opusFrame = opusEncoderRef.current.encode(int16Data);
              if (opusFrame && opusFrame.length > 0) {
                // 缓冲音频数据
                setConversationState(prev => ({
                  ...prev,
                  audioBuffers: [...prev.audioBuffers, opusFrame]
                }));
              }
            } catch (err:any) {
              log(`Opus 编码错误: ${err?.message || err}`, 'error');
            }
          }
        };
        
        src.connect(processor);
        processor.connect(ctx.destination);
        
        // 保存引用以便停止时断开连接
        (window as any).__voiceProcessor = processor;
        (window as any).__voiceSource = src;
        
        // 发送监听开始消息
        const currentTime = Date.now();
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const startMessage = {
            type:'listen',
            mode:'manual',
            state:'start',
            timestamp: currentTime,
            session_id: conversationState.sessionId
          };
          wsRef.current.send(JSON.stringify(startMessage));
          log('语音监听开始消息已发送', 'info');
        }
      }
      
      // 更新对话状态
      setConversationState(prev => ({
        ...prev,
        isListening: true,
        listeningStartTime: Date.now(),
        vadState: VadState.SPEECH_DETECTED,
        audioBuffers: [] // 清空之前的缓冲区
      }));
      
      log('语音监听已开始', 'success');
      
    } catch (error) {
      log(`开始语音监听失败: ${error}`, 'error');
      // 出错时重置状态
      setConversationState(prev => ({
        ...prev,
        isListening: false,
        vadState: VadState.ERROR
      }));
    }
  };

  // 停止语音监听
  const stopVoiceListening = () => {
    log('停止语音监听...', 'info');
    
    // 清除动画帧
    if (vizIdRef.current) {
      cancelAnimationFrame(vizIdRef.current);
      vizIdRef.current = null;
    }
    
    // 断开音频处理节点连接
    const processor = (window as any).__voiceProcessor;
    const source = (window as any).__voiceSource;
    
    if (processor) {
      if (source) {
        try {
          source.disconnect(processor);
        } catch (e) {
          log(`断开source到processor连接失败: ${e}`, 'debug');
        }
      }
      
      if (processor instanceof AudioWorkletNode) {
        try {
          processor.port.postMessage({ command: 'stop' });
        } catch (e) {
          log(`发送stop命令到AudioWorklet失败: ${e}`, 'debug');
        }
        try {
          processor.disconnect();
        } catch (e) {
          log(`断开AudioWorklet节点失败: ${e}`, 'debug');
        }
      } else if (processor.onaudioprocess) {
        try {
          processor.onaudioprocess = null;
          processor.disconnect();
        } catch (e) {
          log(`断开ScriptProcessor节点失败: ${e}`, 'debug');
        }
      }
      
      (window as any).__voiceProcessor = null;
      (window as any).__voiceSource = null;
    }
    
    // 发送监听结束消息
    const currentTime = Date.now();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // 发送空的Opus帧表示结束
      const emptyOpusFrame = new Uint8Array(0);
      try {
        wsRef.current.send(emptyOpusFrame);
      } catch (e) {
        log(`发送结束帧错误: ${e}`, 'error');
      }
      
      // 发送结束消息
      const stopMessage = {
        type:'listen',
        mode:'manual',
        state:'stop',
        timestamp: currentTime,
        session_id: conversationState.sessionId
      };
      try {
        wsRef.current.send(JSON.stringify(stopMessage));
        log('语音监听结束消息已发送', 'info');
      } catch (e) {
        log(`发送结束消息错误: ${e}`, 'error');
      }
    }
    
    // 更新对话状态
    const listeningDuration = conversationState.listeningStartTime ? 
      currentTime - conversationState.listeningStartTime : 0;
    
    setConversationState(prev => ({
      ...prev,
      isListening: false,
      listeningDuration,
      lastVoiceTime: currentTime,
      vadState: VadState.SILENCE,
      listeningStartTime: null
    }));
    
    log(`语音监听已停止，监听时长: ${listeningDuration}ms`, 'success');
  };

  // 批量发送缓冲的音频数据函数已在前文定义
  // 开始语音监听函数已在前文定义

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
                          <div className="text-gray-700 font-medium mb-1">
                            NPC ID（角色ID）
                            <span className="text-red-500 ml-1">*</span>
                          </div>
                          
                          {/* NPC选择器 */}
                          {npcList.length > 0 && (
                            <div className="mb-2">
                              <select
                                value={deviceId}
                                onChange={(e) => setDeviceId(e.target.value)}
                                className="w-full px-2 py-1 rounded border border-purple-300 text-xs bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                              >
                                <option value="">-- 请选择NPC --</option>
                                {npcList.map((npc) => (
                                  <option key={npc.id} value={npc.id}>
                                    {npc.name} ({npc.id})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          
                          {/* 手动输入 */}
                          <input
                            type="text"
                            value={deviceId}
                            onChange={(e) => setDeviceId(e.target.value)}
                            className="w-full px-2 py-1 rounded border border-purple-300 text-xs bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                            placeholder="或手动输入NPC的ID（UUID格式）..."
                          />
                          <div className="text-gray-500 text-xs mt-1">
                            💡 切换不同的NPC ID可以对话不同的角色，每个角色的对话历史是独立的
                          </div>
                          {loadingNPCs && (
                            <div className="text-gray-400 text-xs mt-1">正在加载NPC列表...</div>
                          )}
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
                      {npcInfo?.name && <span className="ml-2">{npcInfo.name}</span>}
                    </h1>
                    <p className="text-sm opacity-80">与 {childInfo?.name || '用户'} 对话中</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {/* 调试信息按钮 */}
                  <button
                    onClick={() => setShowDebugInfo(!showDebugInfo)}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 transition-all px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {showDebugInfo ? '隐藏调试' : '调试信息'}
                  </button>
                  

                </div>
              </header>

              {/* 调试信息面板 */}
              {showDebugInfo && (
                <div className="bg-gray-50 border-b border-gray-200 p-4 max-h-96 overflow-y-auto">
                  <div className="text-sm font-medium text-gray-700 mb-3">调试信息</div>
                  
                  {/* NPC ID 设置 - 突出显示 */}
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                    <div className="text-sm font-semibold text-purple-800 mb-2">
                      🎭 切换 NPC 角色
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      选择或输入NPC ID可以切换到不同的角色进行对话
                    </div>
                    
                    {/* NPC选择器 */}
                    {npcList.length > 0 && (
                      <div className="mb-2">
                        <label className="text-xs text-gray-600 mb-1 block">快速选择NPC：</label>
                        <select
                          value={deviceId}
                          onChange={async (e) => {
                            const newDeviceId = e.target.value;
                            // 设置新的NPC ID
                            setDeviceId(newDeviceId);
                            // 加载用户跨NPC的合并历史（以Supabase为准）
                            if (userId) {
                              try {
                                const history = await getMergedDialogueHistory(userId);
                                const formatted = history.map(msg => ({
                                  text: msg.message,
                                  isUser: !msg.is_npc,
                                  timestamp: new Date(msg.created_at)
                                }));
                                setConversation(formatted);
                                log(`合并历史 ${formatted.length} 条`, 'info');
                              } catch (err) {
                                console.error('加载合并历史失败:', err);
                              }
                            }
                            // 自动切换并重连
                            if (newDeviceId && wsRef.current) {
                              disconnect();
                              setTimeout(() => connect(), 500);
                            }
                          }}
                          className="w-full px-3 py-2 rounded border-2 border-purple-300 text-sm bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                        >
                          <option value="">-- 请选择NPC --</option>
                          {npcList.map((npc) => (
                            <option key={npc.id} value={npc.id}>
                              {npc.name} ({npc.id})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    {/* 手动输入NPC ID */}
                    <div className="mb-2">
                      <label className="text-xs text-gray-600 mb-1 block">或手动输入NPC ID：</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={deviceId}
                          onChange={(e) => setDeviceId(e.target.value)}
                          className="flex-1 px-3 py-2 rounded border-2 border-purple-300 text-sm bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                          placeholder="输入NPC的ID（UUID格式）..."
                        />
                        <button
                          onClick={() => {
                            if (deviceId && wsRef.current) {
                              disconnect();
                              setTimeout(() => connect(), 500);
                            }
                          }}
                          disabled={!deviceId}
                          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          切换并重连
                        </button>
                      </div>
                    </div>
                    
                    {npcInfo && (
                      <div className="mt-2 text-xs text-purple-700">
                        当前角色：<span className="font-semibold">{npcInfo.name}</span>
                        {npcInfo.description && (
                          <div className="text-gray-600 mt-1">{npcInfo.description}</div>
                        )}
                      </div>
                    )}
                    {loadingNPCs && (
                      <div className="mt-2 text-xs text-gray-500">正在加载NPC列表...</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <div className="text-gray-500">设备MAC</div>
                      <div className="text-gray-800 truncate">{deviceMac}</div>
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <div className="text-gray-500">客户端ID</div>
                      <div className="text-gray-800 truncate">{clientId}</div>
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <div className="text-gray-500">OTA状态</div>
                      <div className={otaOk ? 'text-green-600' : 'text-red-600'}>{otaOk ? '已连接' : '未连接'}</div>
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <div className="text-gray-500">WS状态</div>
                      <div className={wsOk ? 'text-green-600' : 'text-red-600'}>{wsOk ? '已连接' : '未连接'}</div>
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <div className="text-gray-500">Opus状态</div>
                      <div className={opusReady ? 'text-green-600' : 'text-orange-600'}>{opusReady ? '已加载' : '加载中...'}</div>
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <div className="text-gray-500">录音状态</div>
                      <div className={isRecording ? 'text-red-600' : 'text-gray-600'}>{isRecording ? '录音中' : '未录音'}</div>
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <div className="text-gray-500">VAD状态</div>
                      <div className={vadState === VadState.SPEECH_DETECTED ? 'text-blue-600' : vadState === VadState.SPEAKING ? 'text-green-600' : 'text-gray-600'}>
                        {vadState === VadState.SPEECH_DETECTED ? '检测到语音' : 
                         vadState === VadState.SPEAKING ? '说话中' : 
                         vadState === VadState.READY ? '就绪' : 
                         vadState === VadState.ERROR ? '错误' : 
                         vadState === VadState.INITIALIZING ? '初始化中' : '静音'}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <div className="text-gray-500">通话状态</div>
                      <div className={isCalling ? 'text-purple-600' : 'text-gray-600'}>{isCalling ? '通话中' : '未通话'}</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-gray-500 text-xs mb-1">服务器URL</div>
                    <div className="bg-white p-2 rounded border border-gray-200 text-xs text-gray-800 break-all">
                      {serverUrl || '未连接'}
                    </div>
                  </div>
                  {/* VAD Indicator */}
                  <div className="mt-3">
                    <div className="text-gray-500 text-xs mb-1">VAD状态指示器</div>
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <VADIndicator />
                    </div>
                  </div>
                </div>
              )}

              {/* 聊天内容区 */}
              <main className={`p-4 md:p-6 overflow-y-auto bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNnptMCAzMGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA6IDYgNnptLTE4LTE4YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDIuNjg2IDYgNiA2em0wIDMCMzMuMzE0IDAgMzYgMi42ODYgMzYgNnMtMi42ODYgNi02IDYtNi0yLjY4Ni02LTYgMi42ODYtNiA2LTZ6bTE4IDBjMy4zMTQgMCA2LTIuNjg2IDYtNnMtMi42ODYtNi02LTYtNiAyLjY4Ni02IDYgMi42ODYgNiA2IDZ6bS0zNiAxOGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY8Ni02LTYtNiAyLjY8Ni02IDYgMi42ODYgNiA2IDZ6bTE4IDMwYzMuMzE0IDAgNi0yLjY8NiA2cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY8NiA2IDZ6bTE4LTE4YzMuMzE0IDAgNi0yLjY8NiA2cy0yLjY8Ni02LTYtNiAyLjY8Ni02IDYgMi42ODYgNiA2IDZ6bTAgMEgwdjYwaDM2djBIMHptMTggMThWMEgwdjE4SDM2eiIvPjwvZz48L3N2Zz4=')] bg-repeat ${
                showDebugInfo 
                  ? 'h-[calc(100vh-220px-240px)] md:h-[calc(100vh-250px-240px)]' 
                  : 'h-[calc(100vh-220px)] md:h-[calc(100vh-250px)]'
              }`}>
                <div className="space-y-4">
                  {isCalling && (
                    <div className="bg-purple-50 p-2 rounded-lg border border-purple-100 text-center">
                      <div className="flex items-center justify-center text-purple-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">通话中，点击按钮结束通话</span>
                      </div>
                    </div>
                  )}
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
                <div className="flex justify-center">
                  <button
                      onClick={isCalling ? endCall : startCall}
                      disabled={!wsOk}
                      className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                        isCalling 
                          ? 'bg-red-500 text-white animate-pulse' 
                          : 'bg-purple-500 text-white hover:bg-purple-600'
                      }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {isCalling ? (
                        // 终止图标（电话挂断）
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      ) : (
                        // 打电话图标
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      )}
                    </svg>
                  </button>
                </div>

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