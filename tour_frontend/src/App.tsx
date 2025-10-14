import { useState, useEffect } from 'react';
import WelcomePage from './components/WelcomePage';
import NPCDialogue from './components/NPCDialogue';
import TaskCenter from './components/TaskCenter';
import RewardAnimation from './components/RewardAnimation';
import NavigationGuide from './components/NavigationGuide';
import type { NPC, Profile, Task, UserTask, Dialogue } from './lib/supabase';

type Page = 'welcome' | 'dialogue' | 'tasks' | 'navigation';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('welcome');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showReward, setShowReward] = useState(false);
  const [currentReward, setCurrentReward] = useState({ type: 'star_energy', amount: 5 });

  const mockProfile: Profile = {
    id: '1',
    nickname: '小明',
    avatar_url: '',
    star_energy: 25,
    total_rewards: 8,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockNPC: NPC = {
    id: '1',
    name: '小河狸咔咔',
    avatar_url: '',
    location: '科学岛入口站',
    greeting_message: '欢迎来到阿派朗创造力乐园！我是你的好朋友咔咔，让我们一起开始这段奇妙的冒险吧！',
    description: '聪明可爱的科学小助手',
    created_at: new Date().toISOString(),
  };

  const nextNPC: NPC = {
    id: '2',
    name: '机械猫头鹰',
    avatar_url: '',
    location: '机械岛小树屋',
    greeting_message: '咔咔告诉我你很棒！',
    description: '喜欢发明创造的智慧导师',
    created_at: new Date().toISOString(),
  };

  const mockDialogues: Dialogue[] = [
    {
      id: '1',
      user_id: '1',
      npc_id: '1',
      message: '嗨！很高兴见到你！我是咔咔，你的探险向导。',
      is_npc: true,
      audio_url: '',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      user_id: '1',
      npc_id: '1',
      message: '在这个神奇的乐园里，有很多有趣的任务等着你哦！',
      is_npc: true,
      audio_url: '',
      created_at: new Date().toISOString(),
    },
    {
      id: '3',
      user_id: '1',
      npc_id: '1',
      message: '完成任务可以获得星能值，用来兑换超棒的礼物呢！',
      is_npc: true,
      audio_url: '',
      created_at: new Date().toISOString(),
    },
    {
      id: '4',
      user_id: '1',
      npc_id: '1',
      message: '准备好了吗？让我们开始第一个任务吧！',
      is_npc: true,
      audio_url: '',
      created_at: new Date().toISOString(),
    },
  ];

  const mockTasks: (Task & { userTask?: UserTask })[] = [
    {
      id: '1',
      npc_id: '1',
      title: '认识科学岛',
      description: '和咔咔一起探索科学岛，了解这里的奇妙设施',
      reward_type: 'star_energy',
      reward_amount: 5,
      max_completions: 1,
      difficulty: 'easy',
      is_active: true,
      created_at: new Date().toISOString(),
      userTask: {
        id: '1',
        user_id: '1',
        task_id: '1',
        status: 'in_progress',
        completions: 0,
        started_at: new Date().toISOString(),
      },
    },
    {
      id: '2',
      npc_id: '1',
      title: '科学小实验',
      description: '跟着咔咔做一个有趣的小实验，探索科学的奥秘',
      reward_type: 'star_energy',
      reward_amount: 10,
      max_completions: 1,
      difficulty: 'medium',
      is_active: true,
      created_at: new Date().toISOString(),
      userTask: {
        id: '2',
        user_id: '1',
        task_id: '2',
        status: 'in_progress',
        completions: 0,
        started_at: new Date().toISOString(),
      },
    },
    {
      id: '3',
      npc_id: '1',
      title: '寻找神秘宝藏',
      description: '根据咔咔的提示，在科学岛上寻找隐藏的宝藏',
      reward_type: 'lucky_bag',
      reward_amount: 1,
      max_completions: 1,
      difficulty: 'hard',
      is_active: true,
      created_at: new Date().toISOString(),
      userTask: {
        id: '3',
        user_id: '1',
        task_id: '3',
        status: 'locked',
        completions: 0,
      },
    },
    {
      id: '4',
      npc_id: '1',
      title: '科学知识问答',
      description: '回答咔咔提出的科学小问题，展示你的知识',
      reward_type: 'star_energy',
      reward_amount: 8,
      max_completions: 3,
      difficulty: 'easy',
      is_active: true,
      created_at: new Date().toISOString(),
      userTask: {
        id: '4',
        user_id: '1',
        task_id: '4',
        status: 'completed',
        completions: 2,
        started_at: new Date(Date.now() - 3600000).toISOString(),
        completed_at: new Date().toISOString(),
      },
    },
  ];

  const handleTaskSelect = (task: Task) => {
    setCurrentReward({
      type: task.reward_type,
      amount: task.reward_amount,
    });
    setShowReward(true);
  };

  const handleRewardClose = () => {
    setShowReward(false);
  };

  const handleNavigateToRewards = () => {
    setShowReward(false);
    alert('兑换中心功能开发中...');
  };

  return (
    <div className="font-sans">
      {currentPage === 'welcome' && (
        <WelcomePage
          npc={mockNPC}
          nickname={mockProfile.nickname}
          onStart={() => setCurrentPage('dialogue')}
        />
      )}

      {currentPage === 'dialogue' && (
        <NPCDialogue
          npc={mockNPC}
          dialogues={mockDialogues}
          onTaskTrigger={() => setCurrentPage('tasks')}
          voiceEnabled={voiceEnabled}
          onVoiceToggle={() => setVoiceEnabled(!voiceEnabled)}
        />
      )}

      {currentPage === 'tasks' && (
        <TaskCenter
          profile={mockProfile}
          tasks={mockTasks}
          onTaskSelect={handleTaskSelect}
          onNavigateNext={() => setCurrentPage('navigation')}
        />
      )}

      {currentPage === 'navigation' && (
        <NavigationGuide
          currentNpc={mockNPC}
          nextNpc={nextNPC}
          onNavigate={() => {
            alert('导航功能开发中...');
            setCurrentPage('welcome');
          }}
        />
      )}

      {showReward && (
        <RewardAnimation
          rewardType={currentReward.type}
          rewardAmount={currentReward.amount}
          onClose={handleRewardClose}
          onNavigate={handleNavigateToRewards}
        />
      )}
    </div>
  );
}

export default App;
