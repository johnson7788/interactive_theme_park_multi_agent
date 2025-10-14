import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type GameTheme = {
  id: string;
  name: string;
  description: string;
  scene_count: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type NPCCharacter = {
  id: string;
  name: string;
  game_theme_id: string;
  avatar_url: string;
  personality: string;
  dialogue_template: any;
  created_at: string;
  updated_at: string;
};

export type TaskTemplate = {
  id: string;
  name: string;
  type: string;
  game_theme_id: string;
  rewards: any;
  trigger_conditions: any;
  content: string;
  created_at: string;
  updated_at: string;
};

export type Checkpoint = {
  id: string;
  name: string;
  area: string;
  position_x: number;
  position_y: number;
  npc_id: string;
  event_config: any;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  name: string;
  points: number;
  completed_tasks: number;
  last_checkin: string;
  created_at: string;
  updated_at: string;
};

export type Reward = {
  id: string;
  name: string;
  type: string;
  conditions: any;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
};
