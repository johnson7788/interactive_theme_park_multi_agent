import { MapPin, ArrowRight, Sparkles, Navigation } from 'lucide-react';
import type { NPC } from '../lib/supabase';

interface NavigationGuideProps {
  currentNpc: NPC;
  nextNpc: NPC;
  onNavigate: () => void;
}

export default function NavigationGuide({ currentNpc, nextNpc, onNavigate }: NavigationGuideProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E9F6FF] via-[#F7F9FB] to-[#FDF8E4] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          >
            <Sparkles className="text-[#2E90FA]/20" size={16 + Math.random() * 16} />
          </div>
        ))}
      </div>

      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#67C23A] to-[#52A02E] text-white px-6 py-3 rounded-full shadow-lg mb-4">
            <Sparkles size={24} />
            <span className="text-xl font-bold">太棒了！</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-3">
            你已经完成了 {currentNpc.location} 的任务
          </h1>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-[30px] shadow-2xl p-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <div className="absolute inset-0 animate-ping-slow">
                <div className="w-32 h-32 rounded-full bg-[#2E90FA]/20"></div>
              </div>
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-[#2E90FA] to-[#1E70D0] p-1 shadow-xl">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                  {nextNpc.avatar_url ? (
                    <img src={nextNpc.avatar_url} alt={nextNpc.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-4xl">{nextNpc.name.charAt(0)}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#2E90FA]/10 to-[#FFCD4B]/10 rounded-[20px] p-6 mb-6">
            <p className="text-2xl font-bold text-gray-800 text-center mb-2">
              {currentNpc.name}说：
            </p>
            <p className="text-lg text-gray-700 text-center leading-relaxed">
              "接下来去 <span className="text-[#2E90FA] font-bold">{nextNpc.location}</span> 找我吧！那里有更多有趣的挑战等着你！"
            </p>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-dashed border-[#2E90FA]/30"></div>
            </div>
            <div className="relative flex justify-center">
              <div className="bg-white px-4">
                <ArrowRight className="text-[#2E90FA] animate-bounce-horizontal" size={32} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#FFCD4B]/20 to-[#FFB82E]/20 rounded-[20px] p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <MapPin className="text-[#2E90FA]" size={24} />
              <h3 className="text-xl font-bold text-gray-800">下一站</h3>
            </div>
            <div className="space-y-2">
              <p className="text-lg">
                <span className="font-bold text-[#2E90FA]">{nextNpc.location}</span>
              </p>
              <p className="text-gray-600">{nextNpc.description}</p>
            </div>
          </div>

          <button
            onClick={onNavigate}
            className="w-full bg-gradient-to-r from-[#2E90FA] to-[#1E70D0] text-white py-4 rounded-full text-xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
          >
            <Navigation size={24} />
            开启导航
            <ArrowRight size={24} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="bg-white/80 backdrop-blur-sm rounded-[15px] p-4 text-center shadow-lg">
            <div className="text-3xl mb-2">🎯</div>
            <p className="text-sm text-gray-600">更多任务</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-[15px] p-4 text-center shadow-lg">
            <div className="text-3xl mb-2">🎁</div>
            <p className="text-sm text-gray-600">丰厚奖励</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-[15px] p-4 text-center shadow-lg">
            <div className="text-3xl mb-2">⭐</div>
            <p className="text-sm text-gray-600">更多星能</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-horizontal {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(10px); }
        }
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2); opacity: 0; }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.8s ease-out forwards; opacity: 0; }
        .animate-bounce-horizontal { animation: bounce-horizontal 1.5s ease-in-out infinite; }
        .animate-ping-slow { animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
      `}</style>
    </div>
  );
}
