import { Star, Lock, CheckCircle, Clock, ArrowRight, Gift } from 'lucide-react';
import type { Task, UserTask, Profile } from '../lib/supabase';

interface TaskWithStatus extends Task {
  userTask?: UserTask;
}

interface TaskCenterProps {
  profile: Profile;
  tasks: TaskWithStatus[];
  onTaskSelect: (task: Task) => void;
  onNavigateNext: () => void;
}

export default function TaskCenter({ profile, tasks, onTaskSelect, onNavigateNext }: TaskCenterProps) {
  const getStatusIcon = (task: TaskWithStatus) => {
    if (!task.userTask || task.userTask.status === 'locked') {
      return <Lock className="text-gray-400" size={24} />;
    }
    if (task.userTask.status === 'completed') {
      return <CheckCircle className="text-[#67C23A]" size={24} />;
    }
    return <Clock className="text-[#2E90FA]" size={24} />;
  };

  const getStatusColor = (task: TaskWithStatus) => {
    if (!task.userTask || task.userTask.status === 'locked') {
      return 'from-gray-200 to-gray-300';
    }
    if (task.userTask.status === 'completed') {
      return 'from-[#67C23A] to-[#52A02E]';
    }
    return 'from-[#2E90FA] to-[#1E70D0]';
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'star_energy':
        return <Star className="text-[#FFCD4B]" size={20} fill="#FFCD4B" />;
      case 'lucky_bag':
        return <Gift className="text-[#FF6B6B]" size={20} />;
      default:
        return <Star className="text-[#FFCD4B]" size={20} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E9F6FF] via-[#F7F9FB] to-[#FDF8E4]">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-[30px] shadow-xl p-6 mb-6 animate-slide-down">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">{profile.nickname}</h2>
              <p className="text-gray-600">继续你的冒险之旅吧！</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end mb-1">
                <Star className="text-[#FFCD4B]" size={28} fill="#FFCD4B" />
                <span className="text-3xl font-bold text-[#2E90FA]">{profile.star_energy}</span>
              </div>
              <p className="text-sm text-gray-500">星能值</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-[#2E90FA]/10 to-[#1E70D0]/10 rounded-[15px] p-3 text-center">
              <p className="text-2xl font-bold text-[#2E90FA]">{tasks.filter(t => t.userTask?.status === 'completed').length}</p>
              <p className="text-xs text-gray-600 mt-1">已完成</p>
            </div>
            <div className="bg-gradient-to-br from-[#FFCD4B]/10 to-[#FFB82E]/10 rounded-[15px] p-3 text-center">
              <p className="text-2xl font-bold text-[#FFCD4B]">{tasks.filter(t => t.userTask?.status === 'in_progress').length}</p>
              <p className="text-xs text-gray-600 mt-1">进行中</p>
            </div>
            <div className="bg-gradient-to-br from-[#67C23A]/10 to-[#52A02E]/10 rounded-[15px] p-3 text-center">
              <p className="text-2xl font-bold text-[#67C23A]">{profile.total_rewards}</p>
              <p className="text-xs text-gray-600 mt-1">总奖励</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Gift className="text-[#2E90FA]" />
            任务列表
          </h3>
        </div>

        <div className="space-y-4 mb-24">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              onClick={() => (task.userTask?.status !== 'locked' ? onTaskSelect(task) : null)}
              className={`bg-white rounded-[20px] shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl ${
                task.userTask?.status === 'locked' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'
              } animate-slide-up`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`h-2 bg-gradient-to-r ${getStatusColor(task)}`}></div>

              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(task)}
                      <h4 className="text-lg font-bold text-gray-800">{task.title}</h4>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{task.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-gradient-to-r from-[#FFCD4B]/20 to-[#FFB82E]/20 px-3 py-1 rounded-full">
                      {getRewardIcon(task.reward_type)}
                      <span className="text-sm font-bold text-gray-700">+{task.reward_amount}</span>
                    </div>

                    {task.userTask && task.userTask.completions > 0 && (
                      <div className="text-xs text-gray-500">
                        {task.userTask.completions}/{task.max_completions} 次
                      </div>
                    )}
                  </div>

                  {task.userTask?.status !== 'locked' && (
                    <ArrowRight className="text-[#2E90FA]" size={24} />
                  )}
                </div>

                {task.difficulty && (
                  <div className="mt-3">
                    <span className={`text-xs px-3 py-1 rounded-full ${
                      task.difficulty === 'easy' ? 'bg-[#67C23A]/20 text-[#67C23A]' :
                      task.difficulty === 'medium' ? 'bg-[#FFCD4B]/20 text-[#FFB82E]' :
                      'bg-[#FF6B6B]/20 text-[#FF6B6B]'
                    }`}>
                      {task.difficulty === 'easy' ? '简单' : task.difficulty === 'medium' ? '中等' : '困难'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={onNavigateNext}
            className="bg-gradient-to-r from-[#67C23A] to-[#52A02E] text-white px-8 py-4 rounded-full text-lg font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
          >
            前往下一站
            <ArrowRight size={24} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slide-down 0.5s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.5s ease-out forwards; opacity: 0; }
      `}</style>
    </div>
  );
}
