import { useState, useRef, useCallback, useEffect } from 'react';
import { MicVAD, getDefaultRealTimeVADOptions } from '@ricky0123/vad-web';

export enum VadState {
    NOT_INITIALIZED = 'not_initialized',
    INITIALIZING = 'initializing',
    READY = 'ready',
    ERROR = 'error',
    SPEAKING = 'speaking',
    SILENCE = 'silence',
    SPEECH_DETECTED = 'speech_detected',
}

interface VadConfig {
    sampleRate?: number;
    threshold?: number;
    minSpeechFrames?: number;
    minSilenceFrames?: number;
    onSpeechEndCallback?: () => void; // 语音结束时的回调函数
    onSpeechStartCallback?: () => void; // 语音开始时的回调函数
}

export interface UseAdvancedVadReturn {
    vadState: VadState;
    isSpeechDetected: boolean;
    startVad: () => Promise<void>;
    stopVad: () => void;
    error: string | null;
    currentVadStateRef: React.MutableRefObject<VadState>;
}

export const useAdvancedVad = (config: VadConfig = {}): UseAdvancedVadReturn => {
    const {
        sampleRate = 16000,
        threshold = 0.3, // 降低阈值到0.3，提高灵敏度
        minSpeechFrames = 3, // 增加最小语音帧数，减少误触发
        minSilenceFrames = 6, // 增加最小静音帧数，确保语音真正结束
        onSpeechEndCallback, // 语音结束时的回调函数
        onSpeechStartCallback, // 语音开始时的回调函数
    } = config;

    const [vadState, setVadState] = useState<VadState>(VadState.NOT_INITIALIZED);
    const [isSpeechDetected, setIsSpeechDetected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 添加ref跟踪当前状态，避免React状态更新的异步问题
    const currentVadStateRef = useRef<VadState>(VadState.NOT_INITIALIZED);

    // 同步ref和state
    useEffect(() => {
        currentVadStateRef.current = vadState;
    }, [vadState]);

    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const vadRef = useRef<MicVAD | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // 创建获取媒体流的函数
    const getStream = useCallback(async (): Promise<MediaStream> => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: sampleRate,
                },
                video: false,
            });
            mediaStreamRef.current = stream;
            return stream;
        } catch (err) {
            throw new Error(`Failed to access microphone: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }, [sampleRate]);

    // 创建音频上下文
    const createAudioContext = useCallback(() => {
        try {
            if (!audioContextRef.current) {
                // 检查浏览器是否支持AudioContext
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                if (!AudioContextClass) {
                    throw new Error('浏览器不支持Web Audio API');
                }

                // 创建AudioContext实例，添加latencyHint优化延迟
                audioContextRef.current = new AudioContextClass({
                    sampleRate: sampleRate,
                    latencyHint: 'interactive'
                });

                console.log('AudioContext创建成功，状态:', audioContextRef.current.state);
            }
            return audioContextRef.current;
        } catch (err) {
            console.error('创建音频上下文失败:', err);
            throw new Error(`创建音频上下文失败: ${err instanceof Error ? err.message : '未知错误'}`);
        }
    }, [sampleRate]);

    // 开始VAD检测
    const startVad = useCallback(async () => {
        try {
            setVadState(VadState.INITIALIZING);
            setError(null);

            // 首先检查浏览器是否支持AudioContext
            if (!window.AudioContext && !(window as any).webkitAudioContext) {
                throw new Error('浏览器不支持Web Audio API');
            }

            // 创建音频上下文
            const audioContext = createAudioContext();

            // 确保音频上下文有效
            if (!audioContext) {
                throw new Error('无法创建音频上下文，AudioContext为null');
            }

            // 等待音频上下文处于有效状态
            if (audioContext.state === 'suspended') {
                console.log('AudioContext处于suspended状态，尝试resume...');
                await audioContext.resume();
                console.log('AudioContext resume完成，当前状态:', audioContext.state);
            }

            // 验证音频上下文状态
            if (audioContext.state === 'closed') {
                throw new Error('音频上下文已关闭');
            }

            console.log('AudioContext状态:', audioContext.state);

            // 获取默认选项并配置
            const defaultOptions = getDefaultRealTimeVADOptions('legacy');

            const vadOptions = {
                ...defaultOptions,
                audioContext: undefined, // 此处传undefined，MicVAD会自动创建（因为MICVAD插件有bug）
                getStream: getStream,
                startOnLoad: false,
                processorType: 'ScriptProcessor' as const, // 强制使用ScriptProcessor，避免Worklet加载问题
                onSpeechStart: () => {
                    console.log('检测到语音开始');
                    setIsSpeechDetected(true);
                    setVadState(VadState.SPEAKING);
                    // 调用语音开始回调
                    if (onSpeechStartCallback) {
                        onSpeechStartCallback();
                    }
                },
                onSpeechEnd: () => {
                    console.log('检测到语音结束');
                    setIsSpeechDetected(false);
                    setVadState(VadState.SILENCE);
                    // 调用语音结束回调
                    if (onSpeechEndCallback) {
                        onSpeechEndCallback();
                    }
                },
                onVADMisfire: () => {
                    console.log('VAD误触发');
                    setIsSpeechDetected(false);
                    setVadState(VadState.SILENCE);
                },
                onFrameProcessed: (probs: any, frame: any) => {
                    // 可选：处理每一帧的VAD概率
                },
                positiveSpeechThreshold: threshold,
                negativeSpeechThreshold: 0.5, // 提高负向阈值，减少误触发
                minSpeechFrames: minSpeechFrames, // 最小语音帧数
                minSilenceFrames: minSilenceFrames, // 最小静音帧数
                preSpeechPadFrames: 2, // 语音前填充帧数
                redemptionFrames: 10, // 增加恢复帧数，提高稳定性
                // 使用public目录下已有的silero_vad_legacy.onnx文件
                modelURL: '/silero_vad_legacy.onnx',
                // 配置onnxruntime-web路径
                onnxWASMBasePath: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.1/dist/',
                // 优化ONNX运行时配置
                ortConfig: (ort: any) => {
                    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.1/dist/';
                },
                // 添加Worklet相关配置，确保路径正确
                baseAssetPath: '/', // 设置基础路径
                workletOptions: {
                    // 如果必须使用Worklet，确保路径正确
                }
            };

            console.log('开始创建MicVAD实例...');

            // 创建MicVAD实例 - 使用库的默认行为，不传递audioContext
            // 这是因为VAD库内部有bug，无法正确处理传递的audioContext参数
            const vadOptionsWithoutAudioContext = {
                ...vadOptions,
                audioContext: undefined // 不传递audioContext，让库自己创建
            };

            const vad = await MicVAD.new(vadOptionsWithoutAudioContext);
            vadRef.current = vad;

            console.log('MicVAD实例创建成功，开始启动VAD...');

            // 启动VAD
            await vad.start();

            setVadState(VadState.READY);
            // 立即更新ref，避免状态异步更新导致的问题
            currentVadStateRef.current = VadState.READY;
            console.log('VAD启动成功，当前的VAD状态：', currentVadStateRef.current);
        } catch (err) {
            console.error('VAD初始化失败:', err);
            const errorMessage = err instanceof Error ? err.message : '未知错误';
            setError(errorMessage);
            setVadState(VadState.ERROR);

            // 提供更详细的错误信息
            if (errorMessage.includes('Audio context is null') || errorMessage.includes('AudioContext为null')) {
                console.error('AudioContext创建失败的可能原因：');
                console.error('1. 浏览器不支持Web Audio API');
                console.error('2. 用户未授予麦克风权限');
                console.error('3. 页面未通过HTTPS访问（某些浏览器要求）');
                console.error('4. 浏览器版本过旧');
            }
        }
    }, [sampleRate, threshold, createAudioContext, getStream]);

    // 停止VAD检测
    const stopVad = useCallback(() => {
        console.log('停止VAD检测...');

        if (vadRef.current) {
            vadRef.current.destroy();
            vadRef.current = null;
            console.log('VAD实例已销毁');
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log('媒体轨道已停止');
            });
            mediaStreamRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close().then(() => {
                console.log('AudioContext已关闭');
            }).catch(err => {
                console.error('关闭AudioContext失败:', err);
            });
            audioContextRef.current = null;
        }

        setIsSpeechDetected(false);
        setVadState(VadState.NOT_INITIALIZED);
        console.log('VAD检测已完全停止');
    }, []);

    // 组件卸载时清理资源
    useEffect(() => {
        return () => {
            stopVad();
        };
    }, [stopVad]);

    return {
        vadState,
        isSpeechDetected,
        startVad,
        stopVad,
        error,
        currentVadStateRef,
    };
};