import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 定义类型
export type NPC = {
  id: string;
  name: string;
  avatar_url: string;
  personality: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  name: string;
  avatar_url: string;
  points: number;
  created_at: string;
  updated_at: string;
};

export type Dialogue = {
  id: string;
  user_id: string;
  npc_id: string;
  message: string;
  is_npc: boolean;
  created_at: string;
};

// NPC聊天日志类型
export type NpcChatLog = {
  id: string;
  npc_id: string;
  user_id: string;
  message_content: string;
  sender_type: 'npc' | 'user';
  session_id: string;
  created_at: string;
};

// 根据NPC-ID获取NPC信息
export const getNPCById = async (npcId: string): Promise<NPC | null> => {
  try {
    const { data, error } = await supabase
      .from('npc_characters')
      .select('*')
      .eq('id', npcId)
      .single();

    if (error) throw error;
    return data as NPC;
  } catch (error) {
    console.error('获取NPC信息失败:', error);
    return null;
  }
};

// 获取当前设备的NPC信息（从.env中读取NEXT_PUBLIC_NPC_DEVICE_ID）
export const getCurrentDeviceNPC = async (): Promise<NPC | null> => {
  const npcId = process.env.NEXT_PUBLIC_NPC_DEVICE_ID;
  if (!npcId) {
    console.error('未配置NEXT_PUBLIC_NPC_DEVICE_ID环境变量');
    return null;
  }
  return getNPCById(npcId);
};

// 获取所有NPC列表
export const getAllNPCs = async (): Promise<NPC[]> => {
  try {
    const { data, error } = await supabase
      .from('npc_characters')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as NPC[];
  } catch (error) {
    console.error('获取NPC列表失败:', error);
    return [];
  }
};

// 根据USER-ID获取用户信息
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data as User;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
};

// 根据用户名获取用户信息（用于输入用户名的弹框）
export const getUserByName = async (userName: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('name', userName)
      .single();

    if (error) throw error;
    return data as User;
  } catch (error) {
    console.error('根据用户名获取用户信息失败:', error);
    return null;
  }
};

// 保存聊天记录到Supabase
export const saveDialogue = async (dialogue: Omit<Dialogue, 'id' | 'created_at'>): Promise<Dialogue | null> => {
  try {
    const { data, error } = await supabase
      .from('dialogues')
      .insert([dialogue])
      .select()
      .single();

    if (error) throw error;
    return data as Dialogue;
  } catch (error) {
    console.error('保存聊天记录失败:', error);
    return null;
  }
};

// 保存聊天记录到本地storage
export const saveDialogueToLocalStorage = (userId: string, npcId: string, dialogue: Dialogue): void => {
  try {
    const key = `chat_history_${userId}_${npcId}`;
    const existingHistory = JSON.parse(localStorage.getItem(key) || '[]') as Dialogue[];
    existingHistory.push(dialogue);
    localStorage.setItem(key, JSON.stringify(existingHistory));
  } catch (error) {
    console.error('保存聊天记录到本地失败:', error);
  }
};

// 从本地storage获取聊天历史
export const getDialogueHistoryFromLocalStorage = (userId: string, npcId: string): Dialogue[] => {
  try {
    const key = `chat_history_${userId}_${npcId}`;
    return JSON.parse(localStorage.getItem(key) || '[]') as Dialogue[];
  } catch (error) {
    console.error('从本地获取聊天历史失败:', error);
    return [];
  }
};

// 保存完整的聊天记录（同时保存到Supabase和本地storage）
export const saveCompleteDialogue = async (dialogue: Omit<Dialogue, 'id' | 'created_at'>): Promise<Dialogue | null> => {
  // 先保存到Supabase
  const savedDialogue = await saveDialogue(dialogue);
  if (!savedDialogue) return null;
  
  // 然后保存到本地storage
  saveDialogueToLocalStorage(dialogue.user_id, dialogue.npc_id, savedDialogue);
  
  return savedDialogue;
};

// 从 npc_chat_logs 表获取聊天历史
export const getNpcChatHistory = async (userId: string, npcId: string): Promise<NpcChatLog[]> => {
  try {
    const { data, error } = await supabase
      .from('npc_chat_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('npc_id', npcId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as NpcChatLog[];
  } catch (error) {
    console.error('从npc_chat_logs获取聊天历史失败:', error);
    return [];
  }
};

// 获取聊天历史记录（优先从本地获取，没有则从Supabase获取）
// 优先从 npc_chat_logs 表读取（因为保存时用的是这个表），如果没有则从 dialogues 表读取
export const getDialogueHistory = async (userId: string, npcId: string): Promise<Dialogue[]> => {
  // 先从本地获取
  const localHistory = getDialogueHistoryFromLocalStorage(userId, npcId);
  if (localHistory.length > 0) {
    return localHistory;
  }
  
  // 如果本地没有，先从 npc_chat_logs 表获取（因为保存时用的是这个表）
  try {
    const chatLogs = await getNpcChatHistory(userId, npcId);
    if (chatLogs.length > 0) {
      // 转换为 Dialogue 格式
      const dialogueHistory: Dialogue[] = chatLogs.map(log => ({
        id: log.id,
        user_id: log.user_id,
        npc_id: log.npc_id,
        message: log.message_content,
        is_npc: log.sender_type === 'npc',
        created_at: log.created_at
      }));
      
      // 保存到本地
      const key = `chat_history_${userId}_${npcId}`;
      localStorage.setItem(key, JSON.stringify(dialogueHistory));
      
      return dialogueHistory;
    }
  } catch (error) {
    console.error('从npc_chat_logs获取聊天历史失败:', error);
  }
  
  // 如果 npc_chat_logs 表没有数据，尝试从 dialogues 表获取（兼容旧数据）
  try {
    const { data, error } = await supabase
      .from('dialogues')
      .select('*')
      .or(`and(user_id.eq.${userId},npc_id.eq.${npcId}),and(user_id.eq.${npcId},npc_id.eq.${userId})`)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // 将从Supabase获取的历史保存到本地
    const dialogueHistory = data as Dialogue[];
    const key = `chat_history_${userId}_${npcId}`;
    localStorage.setItem(key, JSON.stringify(dialogueHistory));
    
    return dialogueHistory;
  } catch (error) {
    console.error('从dialogues获取聊天历史失败:', error);
    return [];
  }
};

// 获取同一用户跨所有NPC的合并聊天历史（以Supabase为准，按时间升序）
export const getMergedDialogueHistory = async (userId: string): Promise<Dialogue[]> => {
  try {
    const { data, error } = await supabase
      .from('npc_chat_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // 映射为 Dialogue 统一结构，保留 npc_id 以便前端区分来源
    const merged: Dialogue[] = (data || []).map((log: any) => ({
      id: log.id,
      user_id: log.user_id,
      npc_id: log.npc_id,
      message: log.message_content,
      is_npc: log.sender_type === 'npc',
      created_at: log.created_at
    }));

    return merged;
  } catch (error) {
    console.error('获取跨NPC合并历史失败:', error);
    return [];
  }
};

// 批量插入NPC聊天日志
export const bulkInsertNpcChatLogs = async (
  logs: Omit<NpcChatLog, 'id' | 'created_at'>[]
): Promise<NpcChatLog[] | null> => {
  try {
    const { data, error } = await supabase
      .from('npc_chat_logs')
      .insert(logs)
      .select();

    if (error) throw error;
    return data as NpcChatLog[];
  } catch (error) {
    console.error('批量插入NPC聊天日志失败:', error);
    return null;
  }
};