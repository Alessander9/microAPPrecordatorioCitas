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
    <div className={`inline-flex items-center gap-2 flex-shrink-0 ${className}`}>
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
        className={`relative inline-flex items-center h-6 w-12 rounded-full p-0.5 cursor-pointer transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gold-500/50 select-none flex-shrink-0 shadow-xs ${
          isDark
            ? 'bg-navy-950 border border-gold-500/40 shadow-inner'
            : 'bg-amber-400 border border-amber-300 shadow-inner'
        }`}
      >
        {/* Background icons for Day/Night indicator */}
        <span className="absolute left-1.5 text-amber-900/60 transition-opacity duration-200 pointer-events-none">
          <Sun className="w-3 h-3 stroke-[2.5]" />
        </span>
        <span className="absolute right-1.5 text-gold-300/80 transition-opacity duration-200 pointer-events-none">
          <Moon className="w-3 h-3 stroke-[2.5]" />
        </span>

        {/* Sliding Thumb: exactly 20px (w-5 h-5), contained inside 48px (w-12) track */}
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full transform transition-transform duration-300 ease-out shadow-sm ${
            isDark
              ? 'translate-x-6 bg-navy-900 text-gold-400 border border-gold-500/50'
              : 'translate-x-0 bg-white text-amber-500 border border-amber-200'
          }`}
        >
          {isDark ? (
            <Moon className="w-3 h-3 fill-current" />
          ) : (
            <Sun className="w-3 h-3 fill-current" />
          )}
        </span>
      </button>
    </div>
  );
};
