import { useState, useEffect } from 'react';
import { Sparkles, Waves } from 'lucide-react';
import type { NPC } from '../lib/supabase';

interface WelcomePageProps {
  npc: NPC;
  nickname: string;
  onStart: () => void;
}

export default function WelcomePage({ npc, nickname, onStart }: WelcomePageProps) {
  const [countdown, setCountdown] = useState(3);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(onStart, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onStart]);

  useEffect(() => {
    setTimeout(() => setIsAnimating(false), 2000);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E9F6FF] via-[#F7F9FB] to-[#FDF8E4] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
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

      <div className="text-center mb-8 animate-fade-in">
        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
          <Waves className="text-[#2E90FA]" size={24} />
          <h1 className="text-2xl font-bold text-gray-800">{npc.location}</h1>
        </div>
      </div>

      <div className={`relative transition-all duration-700 ${isAnimating ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}`}>
        <div className="relative">
          <div className="absolute inset-0 animate-ping-slow">
            <div className="w-48 h-48 rounded-full bg-[#2E90FA]/20"></div>
          </div>

          <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-[#2E90FA] to-[#1E70D0] p-2 shadow-2xl animate-glow">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
              {npc.avatar_url ? (
                <img src={npc.avatar_url} alt={npc.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-6xl">{npc.name.charAt(0)}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center animate-slide-up" style={{ animationDelay: '0.5s' }}>
        <h2 className="text-3xl font-bold text-gray-800 mb-3">
          欢迎你，<span className="text-[#2E90FA]">{nickname}</span>！
        </h2>
        <p className="text-xl text-gray-600 mb-6">{npc.greeting_message}</p>
      </div>

      <div className="mt-8 animate-bounce-gentle">
        <button
          onClick={onStart}
          className="bg-gradient-to-r from-[#2E90FA] to-[#1E70D0] text-white px-12 py-4 rounded-full text-xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
        >
          开始对话 {countdown > 0 && `(${countdown}s)`}
        </button>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 30px rgba(46, 144, 250, 0.5); }
          50% { box-shadow: 0 0 60px rgba(46, 144, 250, 0.8); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-ping-slow { animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .animate-glow { animation: glow 2s ease-in-out infinite; }
        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.8s ease-out forwards; opacity: 0; }
        .animate-bounce-gentle { animation: bounce-gentle 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
