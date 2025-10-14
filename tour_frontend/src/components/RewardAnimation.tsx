import { useEffect, useState } from 'react';
import { Star, Gift, Ticket, Sparkles, X } from 'lucide-react';

interface RewardAnimationProps {
  rewardType: string;
  rewardAmount: number;
  onClose: () => void;
  onNavigate?: () => void;
}

export default function RewardAnimation({
  rewardType,
  rewardAmount,
  onClose,
  onNavigate
}: RewardAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const getRewardConfig = () => {
    switch (rewardType) {
      case 'star_energy':
        return {
          icon: <Star size={80} className="text-[#FFCD4B]" fill="#FFCD4B" />,
          title: '获得星能',
          color: 'from-[#FFCD4B] to-[#FFB82E]',
          bgColor: 'from-[#2E90FA]/20 to-[#FFCD4B]/20',
          message: `恭喜你获得 ${rewardAmount} 点星能！`
        };
      case 'lucky_bag':
        return {
          icon: <Gift size={80} className="text-[#FF6B6B]" />,
          title: '获得福袋',
          color: 'from-[#FF6B6B] to-[#FF4757]',
          bgColor: 'from-[#FF6B6B]/20 to-[#FF4757]/20',
          message: `恭喜你获得 ${rewardAmount} 个福袋！`
        };
      case 'coupon':
        return {
          icon: <Ticket size={80} className="text-[#67C23A]" />,
          title: '获得特惠券',
          color: 'from-[#67C23A] to-[#52A02E]',
          bgColor: 'from-[#67C23A]/20 to-[#52A02E]/20',
          message: `恭喜你获得 ${rewardAmount} 张特惠券！`
        };
      default:
        return {
          icon: <Sparkles size={80} className="text-[#2E90FA]" />,
          title: '获得奖励',
          color: 'from-[#2E90FA] to-[#1E70D0]',
          bgColor: 'from-[#2E90FA]/20 to-[#1E70D0]/20',
          message: `恭喜你获得奖励！`
        };
    }
  };

  const config = getRewardConfig();

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-6 transition-all duration-500 ${
      isVisible ? 'bg-black/50 backdrop-blur-sm' : 'bg-black/0'
    }`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float-up"
            style={{
              left: `${Math.random() * 100}%`,
              top: '100%',
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          >
            <Sparkles className="text-[#FFCD4B]" size={20 + Math.random() * 20} />
          </div>
        ))}
      </div>

      <div className={`relative max-w-md w-full transition-all duration-700 ${
        isVisible ? 'scale-100 opacity-100 rotate-0' : 'scale-50 opacity-0 rotate-12'
      }`}>
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:scale-110 transition-transform"
        >
          <X size={24} className="text-gray-600" />
        </button>

        <div className={`bg-gradient-to-br ${config.bgColor} rounded-[30px] p-8 shadow-2xl`}>
          <div className={`bg-gradient-to-br ${config.color} rounded-[25px] p-8 shadow-xl`}>
            <div className="text-center">
              <div className="inline-block animate-bounce-scale mb-6">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping-slow">
                    <div className="w-32 h-32 rounded-full bg-white/30"></div>
                  </div>
                  <div className="relative bg-white rounded-full p-6 shadow-2xl">
                    {config.icon}
                  </div>
                </div>
              </div>

              <h2 className="text-3xl font-bold text-white mb-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                {config.title}
              </h2>

              <div className="bg-white/90 backdrop-blur-sm rounded-[20px] p-6 mb-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <p className="text-4xl font-bold bg-gradient-to-r from-[#2E90FA] to-[#1E70D0] bg-clip-text text-transparent mb-2">
                  +{rewardAmount}
                </p>
                <p className="text-gray-700 text-lg">{config.message}</p>
              </div>

              <p className="text-white/90 text-lg mb-6 animate-slide-up" style={{ animationDelay: '0.6s' }}>
                快去下一个站点看看吧！
              </p>

              <div className="flex gap-3 animate-slide-up" style={{ animationDelay: '0.8s' }}>
                <button
                  onClick={onClose}
                  className="flex-1 bg-white text-gray-800 py-3 rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  继续探险
                </button>
                {onNavigate && (
                  <button
                    onClick={onNavigate}
                    className="flex-1 bg-gradient-to-r from-[#67C23A] to-[#52A02E] text-white py-3 rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                  >
                    去兑换中心
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
        }
        @keyframes bounce-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float-up { animation: float-up linear forwards; }
        .animate-bounce-scale { animation: bounce-scale 1s ease-in-out infinite; }
        .animate-ping-slow { animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .animate-slide-up { animation: slide-up 0.5s ease-out forwards; opacity: 0; }
      `}</style>
    </div>
  );
}
