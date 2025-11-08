-- NPC与用户聊天记录表
CREATE TABLE IF NOT EXISTS npc_chat_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    npc_id uuid REFERENCES npc_characters(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    message_content text NOT NULL,
    sender_type text NOT NULL CHECK (sender_type IN ('npc', 'user')),
    session_id uuid NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 启用行级安全性
ALTER TABLE npc_chat_logs ENABLE ROW LEVEL SECURITY;

-- 创建安全策略
CREATE POLICY "Authenticated users can manage npc chat logs"
  ON npc_chat_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 游戏主题表
CREATE TABLE IF NOT EXISTS game_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  scene_count integer DEFAULT 0,
  status text DEFAULT '草稿',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE game_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage game themes"
  ON game_themes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- NPC角色表
CREATE TABLE IF NOT EXISTS npc_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  game_theme_id uuid REFERENCES game_themes(id) ON DELETE CASCADE,
  avatar_url text,
  personality text DEFAULT '活泼',
  dialogue_template jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE npc_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage NPCs"
  ON npc_characters
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 任务模板表
CREATE TABLE IF NOT EXISTS task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  game_theme_id uuid REFERENCES game_themes(id) ON DELETE CASCADE,
  rewards jsonb DEFAULT '{}'::jsonb,
  trigger_conditions jsonb DEFAULT '{}'::jsonb,
  content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage task templates"
  ON task_templates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 打卡点表
CREATE TABLE IF NOT EXISTS checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  area text,
  position_x numeric DEFAULT 0,
  position_y numeric DEFAULT 0,
  npc_id uuid REFERENCES npc_characters(id) ON DELETE SET NULL,
  event_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage checkpoints"
  ON checkpoints
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  points integer DEFAULT 0,
  completed_tasks integer DEFAULT 0,
  last_checkin timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage users"
  ON users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 奖励表
CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  conditions jsonb DEFAULT '{}'::jsonb,
  content text,
  status text DEFAULT '启用',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage rewards"
  ON rewards
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 用户任务记录表
CREATE TABLE IF NOT EXISTS user_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  task_id uuid REFERENCES task_templates(id) ON DELETE CASCADE,
  status text DEFAULT '进行中',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage user tasks"
  ON user_tasks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 用户奖励记录表
CREATE TABLE IF NOT EXISTS user_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  reward_id uuid REFERENCES rewards(id) ON DELETE CASCADE,
  received_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage user rewards"
  ON user_rewards
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- AI故事表
CREATE TABLE IF NOT EXISTS ai_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_theme_id uuid REFERENCES game_themes(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  generated_tasks jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage AI stories"
  ON ai_stories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_npc_game_theme ON npc_characters(game_theme_id);
CREATE INDEX IF NOT EXISTS idx_task_game_theme ON task_templates(game_theme_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_npc ON checkpoints(npc_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user ON user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_task ON user_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_stories_theme ON ai_stories(game_theme_id);

-- 创建索引提升查询性能
CREATE INDEX IF NOT EXISTS idx_npc_chat_logs_npc_user ON npc_chat_logs(npc_id, user_id);
CREATE INDEX IF NOT EXISTS idx_npc_chat_logs_session ON npc_chat_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_npc_chat_logs_created_at ON npc_chat_logs(created_at);

