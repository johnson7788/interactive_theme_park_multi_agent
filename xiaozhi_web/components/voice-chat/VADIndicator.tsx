import { useState, useEffect } from 'react';
import { useAdvancedVad, VadState } from '@/hooks/use-advanced-vad';

export const VADIndicator = () => {
  const [audioUrls, setAudioUrls] = useState<string[]>([]);
  const {
    vadState,
    isSpeechDetected,
    startVad,
    stopVad,
    error,
    currentVadStateRef
  } = useAdvancedVad({
    sampleRate: 16000,
    threshold: 0.3,
    minSpeechFrames: 3,
    minSilenceFrames: 6,
    onSpeechEndCallback: () => {
      // 处理语音结束后的音频数据
      console.log('VAD检测到语音结束');
      // 这里可以根据需要处理音频数据
    },
    onSpeechStartCallback: () => {
      console.log('VAD检测到语音开始');
    }
  });

  // 获取VAD状态的显示文本和颜色
  const getVadStateInfo = () => {
    switch (vadState) {
      case VadState.NOT_INITIALIZED:
        return { text: '未初始化', color: 'bg-gray-400' };
      case VadState.INITIALIZING:
        return { text: '初始化中', color: 'bg-yellow-400' };
      case VadState.READY:
        return { text: '就绪', color: 'bg-green-400' };
      case VadState.ERROR:
        return { text: '错误', color: 'bg-red-400' };
      case VadState.SPEAKING:
        return { text: '说话中', color: 'bg-blue-400' };
      case VadState.SILENCE:
        return { text: '静音', color: 'bg-gray-300' };
      case VadState.SPEECH_DETECTED:
        return { text: '检测到语音', color: 'bg-purple-400' };
      default:
        return { text: '未知', color: 'bg-gray-400' };
    }
  };

  const vadStateInfo = getVadStateInfo();

  return (
    <div className="vad-indicator bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">VAD状态指示器</h3>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full ${vadStateInfo.color} mr-2`}></div>
          <span className="text-xs text-gray-500">{vadStateInfo.text}</span>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 p-3 rounded border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">监听状态</div>
            <div className="text-sm font-medium">
              {!vadState ? (
                <span className="text-gray-400">未监听</span>
              ) : (
                <span className="text-green-600">监听中</span>
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">语音检测</div>
            <div className="text-sm font-medium">
              {isSpeechDetected ? (
                <span className="text-blue-600">说话中</span>
              ) : (
                <span className="text-gray-400">静默</span>
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">加载状态</div>
            <div className="text-sm font-medium">
              {vadState === VadState.INITIALIZING ? (
                <span className="text-yellow-600">加载中</span>
              ) : (
                <span className="text-green-600">已完成</span>
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">错误状态</div>
            <div className="text-sm font-medium">
              {error ? (
                <span className="text-red-600 truncate block" title={error}>错误</span>
              ) : (
                <span className="text-green-600">正常</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="pt-2">
          <div className="text-xs text-gray-500 mb-2">控制面板</div>
          <div className="flex space-x-2">
            <button 
              onClick={startVad} 
              disabled={vadState === VadState.INITIALIZING}
              className={`flex-1 py-2 px-3 text-xs rounded-full transition-all ${
                vadState === VadState.INITIALIZING 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              开始监听
            </button>
            <button 
              onClick={stopVad}
              className="flex-1 py-2 px-3 text-xs rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-all"
            >
              停止监听
            </button>
          </div>
        </div>
        
        <div className="pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-500">音频片段数量: {audioUrls.length}</div>
        </div>
      </div>
    </div>
  );
};

export default VADIndicator;