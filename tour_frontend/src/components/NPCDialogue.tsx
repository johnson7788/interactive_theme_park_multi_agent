import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import type { NPC, Dialogue } from '../lib/supabase';

interface NPCDialogueProps {
  npc: NPC;
  dialogues: Dialogue[];
  onTaskTrigger?: () => void;
  voiceEnabled: boolean;
  onVoiceToggle: () => void;
}

export default function NPCDialogue({
  npc,
  dialogues,
  onTaskTrigger,
  voiceEnabled,
  onVoiceToggle
}: NPCDialogueProps) {
  const [activeBubble, setActiveBubble] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogues]);

  const handlePlayAudio = (dialogue: Dialogue) => {
    if (!voiceEnabled) return;
    setActiveBubble(dialogue.id);
    setTimeout(() => setActiveBubble(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E9F6FF] via-[#F7F9FB] to-[#FDF8E4] flex flex-col">
      <div className="bg-white/80 backdrop-blur-sm shadow-lg p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-[#2E90FA] to-[#1E70D0] p-1 ${activeBubble ? 'animate-pulse-ring' : ''}`}>
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                  {npc.avatar_url ? (
                    <img src={npc.avatar_url} alt={npc.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-2xl">{npc.name.charAt(0)}</div>
                  )}
                </div>
              </div>
              {activeBubble && (
                <div className="absolute -right-1 -bottom-1 animate-bounce">
                  <div className="w-6 h-6 bg-[#FFCD4B] rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-800">{npc.name}</h2>
              <p className="text-sm text-gray-500">{npc.location}</p>
            </div>
          </div>

          <button
            onClick={onVoiceToggle}
            className={`p-3 rounded-full transition-all ${
              voiceEnabled
                ? 'bg-[#2E90FA] text-white shadow-lg'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {voiceEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
        <div className="space-y-4 pb-24">
          {dialogues.map((dialogue, index) => (
            <div
              key={dialogue.id}
              className={`flex ${dialogue.is_npc ? 'justify-start' : 'justify-end'} animate-slide-in`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div
                onClick={() => handlePlayAudio(dialogue)}
                className={`max-w-[75%] cursor-pointer transition-all duration-300 hover:scale-105 ${
                  dialogue.is_npc
                    ? 'bg-gradient-to-br from-[#2E90FA] to-[#1E70D0] text-white rounded-[20px] rounded-tl-[5px]'
                    : 'bg-gradient-to-br from-[#FFCD4B] to-[#FFB82E] text-gray-800 rounded-[20px] rounded-tr-[5px]'
                } p-4 shadow-lg ${activeBubble === dialogue.id ? 'ring-4 ring-white' : ''}`}
              >
                <p className="text-lg leading-relaxed">{dialogue.message}</p>
                {dialogue.is_npc && (
                  <div className="mt-2 flex items-center gap-2 opacity-75">
                    <Sparkles size={16} />
                    <span className="text-sm">点击重播</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      {onTaskTrigger && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 animate-bounce-gentle">
          <button
            onClick={onTaskTrigger}
            className="bg-gradient-to-r from-[#67C23A] to-[#52A02E] text-white px-8 py-4 rounded-full text-lg font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
          >
            <Sparkles size={24} />
            查看任务
          </button>
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(46, 144, 250, 0.7); }
          50% { box-shadow: 0 0 0 10px rgba(46, 144, 250, 0); }
        }
        @keyframes bounce-gentle {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-10px); }
        }
        .animate-slide-in { animation: slide-in 0.5s ease-out forwards; opacity: 0; }
        .animate-pulse-ring { animation: pulse-ring 1.5s ease-in-out infinite; }
        .animate-bounce-gentle { animation: bounce-gentle 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
