import React from 'react';
import { Sparkles } from 'lucide-react';

interface AssistantButtonProps {
  onClick: () => void;
}

export const AssistantButton: React.FC<AssistantButtonProps> = ({ onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-20 md:bottom-8 right-4 sm:right-6 md:right-8 z-30 group flex items-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 dark:from-gold-500 dark:via-amber-400 dark:to-gold-500 text-gold-400 dark:text-navy-950 font-bold text-xs shadow-xl shadow-navy-950/20 dark:shadow-gold-500/20 border border-gold-500/40 hover:scale-105 active:scale-95 transition-all duration-200"
      title="Abrir Asistente IA con DeepSeek"
      aria-label="Abrir Asistente de Citas"
    >
      <div className="relative">
        <Sparkles className="w-4 h-4 fill-current text-gold-400 dark:text-navy-950 animate-pulse" />
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
      </div>
      <span className="tracking-wide hidden xs:inline font-bold">
        Asistente IA
      </span>
    </button>
  );
};
