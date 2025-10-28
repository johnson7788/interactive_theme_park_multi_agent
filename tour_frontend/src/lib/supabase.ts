import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  nickname: string;
  avatar_url: string;
  star_energy: number;
  total_rewards: number;
  created_at: string;
  updated_at: string;
};

export type NPC = {
  id: string;
  name: string;
  avatar_url: string;
  location: string;
  greeting_message: string;
  description: string;
  created_at: string;
};

export type Task = {
  id: string;
  npc_id: string;
  title: string;
  description: string;
  reward_type: string;
  reward_amount: number;
  max_completions: number;
  difficulty: string;
  is_active: boolean;
  created_at: string;
};

export type UserTask = {
  id: string;
  user_id: string;
  task_id: string;
  status: 'locked' | 'in_progress' | 'completed';
  completions: number;
  started_at?: string;
  completed_at?: string;
};

export type Dialogue = {
  id: string;
  user_id: string;
  npc_id: string;
  message: string;
  is_npc: boolean;
  audio_url: string;
  created_at: string;
};

export type Reward = {
  id: string;
  user_id: string;
  task_id?: string;
  reward_type: string;
  reward_amount: number;
  claimed_at: string;
};
