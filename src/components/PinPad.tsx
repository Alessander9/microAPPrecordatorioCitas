import React from 'react';
import { Delete } from 'lucide-react';

interface PinPadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  disabled?: boolean;
}

export const PinPad: React.FC<PinPadProps> = ({ onDigit, onDelete, disabled }) => {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-[280px] sm:max-w-xs mx-auto w-full my-4">
      {digits.map((item, index) => {
        if (item === '') {
          return <div key={`empty-${index}`} />;
        }

        if (item === 'del') {
          return (
            <button
              key="btn-del"
              type="button"
              onClick={onDelete}
              disabled={disabled}
              className="h-14 sm:h-16 rounded-2xl flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 active:scale-95 transition-all duration-150 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-navy-800"
              aria-label="Borrar dígito"
            >
              <Delete className="w-6 h-6" />
            </button>
          );
        }

        return (
          <button
            key={`btn-${item}`}
            type="button"
            onClick={() => onDigit(item)}
            disabled={disabled}
            className="h-14 sm:h-16 rounded-2xl bg-white dark:bg-navy-800/80 border border-slate-200 dark:border-navy-700/60 shadow-sm text-2xl font-semibold text-navy-900 dark:text-slate-100 flex items-center justify-center active:scale-95 active:bg-gold-500/10 hover:border-gold-500/40 transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
          >
            {item}
          </button>
        );
      })}
    </div>
  );
};
