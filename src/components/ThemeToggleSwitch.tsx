import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleSwitchProps {
  className?: string;
  showLabels?: boolean;
}

export const ThemeToggleSwitch: React.FC<ThemeToggleSwitchProps> = ({ 
  className = '',
  showLabels = false 
}) => {
  const { isDark, toggleDark } = useTheme();

  const handleToggle = () => {
    if (navigator.vibrate) {
      try { navigator.vibrate(8); } catch {}
    }
    toggleDark();
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabels && (
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 select-none">
          {isDark ? 'Modo Oscuro' : 'Modo Claro'}
        </span>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Alternar entre modo claro y modo oscuro"
        onClick={handleToggle}
        className={`relative inline-flex items-center h-7 w-13 sm:h-8 sm:w-15 rounded-full p-0.5 cursor-pointer transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gold-500/50 select-none shadow-sm ${
          isDark
            ? 'bg-gradient-to-r from-navy-950 via-slate-900 to-indigo-950 border border-gold-500/40 shadow-inner'
            : 'bg-gradient-to-r from-amber-300 via-amber-400 to-gold-400 border border-amber-300 shadow-inner'
        }`}
      >
        {/* Subtle background icons for Day/Night effect */}
        <span className="absolute left-1.5 text-amber-900/60 transition-opacity duration-200">
          <Sun className="w-3 h-3 stroke-[2.5]" />
        </span>
        <span className="absolute right-1.5 text-gold-300/80 transition-opacity duration-200">
          <Moon className="w-3 h-3 stroke-[2.5]" />
        </span>

        {/* Sliding Thumb */}
        <span
          className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full transform transition-transform duration-300 ease-spring shadow-md ${
            isDark
              ? 'translate-x-6 sm:translate-x-7 bg-navy-900 text-gold-400 border border-gold-500/50'
              : 'translate-x-0.5 bg-white text-amber-500 border border-amber-200'
          }`}
        >
          {isDark ? (
            <Moon className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current animate-spin-slow" />
          ) : (
            <Sun className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current animate-pulse" />
          )}
        </span>
      </button>
    </div>
  );
};
