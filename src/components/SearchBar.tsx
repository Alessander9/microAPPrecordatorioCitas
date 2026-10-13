import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  totalCount: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, totalCount }) => {
  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={`Buscar por nombre (${totalCount} registrados)...`}
        className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50 shadow-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Limpiar búsqueda"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
