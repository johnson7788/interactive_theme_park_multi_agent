import { useState, useEffect, useCallback, useRef } from 'react';
import { Application, ApplicationConfig } from '@/lib/application';
import { DeviceState } from '@/lib/constants';
import { 
  getCurrentDeviceNPC, 
  getUserByName, 
  getUserById,
  saveCompleteDialogue,
  getDialogueHistory,
  type NPC, 
  type User,
  type Dialogue
} from '@/lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useVoiceChat() {
  const [deviceState, setDeviceState] = useState<DeviceState>(DeviceState.IDLE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [emotion, setEmotion] = useState<string>('neutral');
  const [npcInfo, setNpcInfo] = useState<NPC | null>(null);
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  const appRef = useRef<Application | null>(null);
  
  // 初始化Supabase连接和加载NPC信息
  useEffect(() => {
    appRef.current = Application.getInstance();
    
    // 加载NPC信息
    const loadNPCInfo = async () => {
      try {
        const npc = await getCurrentDeviceNPC();
        if (npc) {
          setNpcInfo(npc);
        }
      } catch (err) {
        console.error('加载NPC信息失败:', err);
      }
    };
    
    loadNPCInfo();

    return () => {
      if (appRef.current) {
        appRef.current.shutdown();
      }
    };
  }, []);
  
  // 当用户ID或用户名变化时，加载用户信息
  useEffect(() => {
    const loadUserInfo = async () => {
      if (!userId && !userName) return;
      
      try {
        let user: User | null = null;
        if (userId) {
          user = await getUserById(userId);
        } else if (userName) {
          user = await getUserByName(userName);
        }
        
        if (user) {
          setUserInfo(user);
          setUserId(user.id);
          // 保存用户ID到本地存储
          localStorage.setItem('userId', user.id);
          
          // 加载聊天历史
          if (npcInfo) {
            loadChatHistory(user.id, npcInfo.id);
          }
        }
      } catch (err) {
        console.error('加载用户信息失败:', err);
      }
    };
    
    loadUserInfo();
  }, [userId, userName, npcInfo]);
  
  // 加载聊天历史
  const loadChatHistory = async (userId: string, npcId: string) => {
    try {
      const history = await getDialogueHistory(userId, npcId);
      const formattedMessages: Message[] = history.map(msg => ({
        role: msg.is_npc ? 'assistant' : 'user',
        content: msg.message,
        timestamp: new Date(msg.created_at)
      }));
      setMessages(formattedMessages);
    } catch (err) {
      console.error('加载聊天历史失败:', err);
    }
  };

  const initialize = useCallback(async (config: ApplicationConfig) => {
    if (!appRef.current) return false;

    try {
      appRef.current.onDeviceStateChanged((state) => {
        setDeviceState(state);
      });

      appRef.current.onIncomingJson((data) => {
        const msgType = data.type;

        if (msgType === 'tts') {
          const text = data.text;
          if (text && userId && npcInfo) {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: text, timestamp: new Date() }
            ]);
            
            // 保存NPC回复到Supabase和本地存储
            saveCompleteDialogue({
              user_id: userId,
              npc_id: npcInfo.id,
              message: text,
              is_npc: true
            });
          }
        } else if (msgType === 'stt') {
          const text = data.text;
          if (text && userId && npcInfo) {
            setMessages((prev) => [
              ...prev,
              { role: 'user', content: text, timestamp: new Date() }
            ]);
            
            // 保存用户消息到Supabase和本地存储
            saveCompleteDialogue({
              user_id: userId,
              npc_id: npcInfo.id,
              message: text,
              is_npc: false
            });
          }
        } else if (msgType === 'llm') {
          const emotionValue = data.emotion;
          if (emotionValue) {
            setEmotion(emotionValue);
          }
        }
      });

      appRef.current.onNetworkError((errorMsg) => {
        setError(errorMsg);
      });

      const success = await appRef.current.initialize(config);
      setIsInitialized(success);
      return success;
    } catch (err) {
      console.error('Failed to initialize:', err);
      setError(String(err));
      return false;
    }
  }, [userId, npcInfo]);

  const startListening = useCallback(async () => {
    if (!appRef.current) return;
    await appRef.current.startAutoConversation();
  }, []);

  const stopListening = useCallback(async () => {
    if (!appRef.current) return;
    await appRef.current.stopConversation();
  }, []);

  const startManualListening = useCallback(async () => {
    if (!appRef.current) return;
    await appRef.current.startListeningManual();
  }, []);

  const stopManualListening = useCallback(async () => {
    if (!appRef.current) return;
    await appRef.current.stopListeningManual();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 通过用户名获取用户信息
  const fetchUserByName = useCallback(async (name: string) => {
    try {
      setUserName(name);
    } catch (err) {
      console.error('获取用户信息失败:', err);
    }
  }, []);

  // 手动设置用户ID
  const setCurrentUserId = useCallback((id: string) => {
    setUserId(id);
    localStorage.setItem('userId', id);
  }, []);

  return {
    deviceState,
    messages,
    error,
    emotion,
    isInitialized,
    npcInfo,
    userInfo,
    userId,
    initialize,
    startListening,
    stopListening,
    startManualListening,
    stopManualListening,
    clearMessages,
    clearError,
    fetchUserByName,
    setCurrentUserId,
  };
}