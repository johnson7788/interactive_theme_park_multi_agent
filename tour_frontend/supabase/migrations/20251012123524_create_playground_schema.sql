/*
  # 阿派朗创造力乐园 - Database Schema

  ## Overview
  Creates the core database structure for the Apalong Creativity Playground system,
  supporting NPC interactions, task management, and reward tracking for children aged 4-10.

  ## New Tables
  
  ### 1. `profiles`
  User profile information linked to authentication
  - `id` (uuid, references auth.users)
  - `nickname` (text) - Child's display name
  - `avatar_url` (text) - Profile image
  - `star_energy` (integer) - 星能值 accumulated points
  - `total_rewards` (integer) - Total rewards earned
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `npcs`
  NPC character definitions (like "小河狸咔咔")
  - `id` (uuid, primary key)
  - `name` (text) - NPC display name
  - `avatar_url` (text) - NPC character image
  - `location` (text) - Station/area name (e.g., "科学岛入口站")
  - `greeting_message` (text) - Welcome dialogue
  - `description` (text) - NPC backstory
  - `created_at` (timestamptz)

  ### 3. `tasks`
  Available tasks/missions at each station
  - `id` (uuid, primary key)
  - `npc_id` (uuid, references npcs)
  - `title` (text) - Task name
  - `description` (text) - Task details
  - `reward_type` (text) - 'star_energy', 'lucky_bag', 'coupon'
  - `reward_amount` (integer) - Points or quantity
  - `max_completions` (integer) - How many times can be completed
  - `difficulty` (text) - 'easy', 'medium', 'hard'
  - `is_active` (boolean) - Whether task is currently available
  - `created_at` (timestamptz)

  ### 4. `user_tasks`
  Track user progress on tasks
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `task_id` (uuid, references tasks)
  - `status` (text) - 'locked', 'in_progress', 'completed'
  - `completions` (integer) - Times completed
  - `started_at` (timestamptz)
  - `completed_at` (timestamptz)

  ### 5. `dialogues`
  NPC conversation history
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `npc_id` (uuid, references npcs)
  - `message` (text) - Dialogue content
  - `is_npc` (boolean) - True if NPC speaking, false if user
  - `audio_url` (text) - TTS audio file URL
  - `created_at` (timestamptz)

  ### 6. `rewards`
  User reward redemption records
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `task_id` (uuid, references tasks)
  - `reward_type` (text)
  - `reward_amount` (integer)
  - `claimed_at` (timestamptz)

  ### 7. `check_ins`
  RFID bracelet check-in records
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `npc_id` (uuid, references npcs)
  - `checked_in_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access their own data
  - NPCs and tasks are readable by all authenticated users
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nickname text NOT NULL,
  avatar_url text DEFAULT '',
  star_energy integer DEFAULT 0,
  total_rewards integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create NPCs table
CREATE TABLE IF NOT EXISTS npcs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar_url text DEFAULT '',
  location text NOT NULL,
  greeting_message text DEFAULT '',
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_id uuid REFERENCES npcs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  reward_type text DEFAULT 'star_energy',
  reward_amount integer DEFAULT 5,
  max_completions integer DEFAULT 1,
  difficulty text DEFAULT 'easy',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create user_tasks table
CREATE TABLE IF NOT EXISTS user_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  status text DEFAULT 'locked',
  completions integer DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  UNIQUE(user_id, task_id)
);

-- Create dialogues table
CREATE TABLE IF NOT EXISTS dialogues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  npc_id uuid REFERENCES npcs(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_npc boolean DEFAULT true,
  audio_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create rewards table
CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  reward_type text NOT NULL,
  reward_amount integer DEFAULT 0,
  claimed_at timestamptz DEFAULT now()
);

-- Create check_ins table
CREATE TABLE IF NOT EXISTS check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  npc_id uuid REFERENCES npcs(id) ON DELETE CASCADE,
  checked_in_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE npcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialogues ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- NPCs policies (readable by all authenticated users)
CREATE POLICY "Authenticated users can view NPCs"
  ON npcs FOR SELECT
  TO authenticated
  USING (true);

-- Tasks policies (readable by all authenticated users)
CREATE POLICY "Authenticated users can view tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

-- User tasks policies
CREATE POLICY "Users can view own tasks"
  ON user_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON user_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON user_tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Dialogues policies
CREATE POLICY "Users can view own dialogues"
  ON dialogues FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dialogues"
  ON dialogues FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Rewards policies
CREATE POLICY "Users can view own rewards"
  ON rewards FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rewards"
  ON rewards FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Check-ins policies
CREATE POLICY "Users can view own check-ins"
  ON check_ins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own check-ins"
  ON check_ins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_task_id ON user_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_dialogues_user_id ON dialogues(user_id);
CREATE INDEX IF NOT EXISTS idx_dialogues_npc_id ON dialogues(npc_id);
CREATE INDEX IF NOT EXISTS idx_rewards_user_id ON rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON check_ins(user_id);