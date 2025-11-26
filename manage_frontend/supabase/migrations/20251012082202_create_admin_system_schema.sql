/*
  # 阿派朗创造力乐园管理系统数据库架构

  ## 新建表

  ### 1. game_themes - 游戏主题
  - `id` (uuid, primary key)
  - `name` (text) - 游戏名称
  - `description` (text) - 游戏描述
  - `scene_count` (integer) - 场景数量
  - `status` (text) - 状态: 已启用/未启用/草稿
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. npc_characters - NPC角色
  - `id` (uuid, primary key)
  - `name` (text) - 角色名称
  - `game_theme_id` (uuid) - 关联游戏主题
  - `avatar_url` (text) - 头像URL
  - `personality` (text) - 语气: 活泼/温柔/睿智/搞笑
  - `dialogue_template` (jsonb) - 对话模板
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. task_templates - 任务模板
  - `id` (uuid, primary key)
  - `name` (text) - 任务名称
  - `type` (text) - 类型: 问答/采集/导流/测试
  - `game_theme_id` (uuid) - 关联游戏主题
  - `rewards` (jsonb) - 奖励配置
  - `trigger_conditions` (jsonb) - 触发条件
  - `content` (text) - 任务内容
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. checkpoints - 打卡点
  - `id` (uuid, primary key)
  - `name` (text) - 打卡点名称
  - `area` (text) - 所属区域
  - `position_x` (numeric) - X坐标
  - `position_y` (numeric) - Y坐标
  - `npc_id` (uuid) - 绑定NPC
  - `event_config` (jsonb) - 事件配置
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. users - 用户
  - `id` (uuid, primary key)
  - `name` (text) - 用户名称
  - `points` (integer) - 积分
  - `completed_tasks` (integer) - 完成任务数
  - `last_checkin` (timestamptz) - 最后打卡时间
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 6. rewards - 奖励
  - `id` (uuid, primary key)
  - `name` (text) - 奖励名称
  - `type` (text) - 类型: 积分/限量/地点/时间
  - `conditions` (jsonb) - 条件配置
  - `content` (text) - 奖励内容
  - `status` (text) - 状态: 启用/停用
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. user_tasks - 用户任务记录
  - `id` (uuid, primary key)
  - `user_id` (uuid) - 用户ID
  - `task_id` (uuid) - 任务ID
  - `status` (text) - 状态: 进行中/已完成
  - `completed_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 8. user_rewards - 用户奖励记录
  - `id` (uuid, primary key)
  - `user_id` (uuid) - 用户ID
  - `reward_id` (uuid) - 奖励ID
  - `received_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 9. ai_stories - AI生成的故事
  - `id` (uuid, primary key)
  - `game_theme_id` (uuid) - 关联游戏主题
  - `title` (text) - 故事标题
  - `content` (text) - 故事内容
  - `generated_tasks` (jsonb) - 生成的任务模板
  - `created_at` (timestamptz)

  ## 安全性
  - 所有表启用RLS
  - 管理员需要通过auth验证才能访问
*/

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