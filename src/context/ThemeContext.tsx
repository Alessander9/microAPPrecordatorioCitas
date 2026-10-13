import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSetting, setSetting } from '../db/db';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (mode: ThemeMode) => Promise<void>;
  toggleDark: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDocumentClass(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('app_theme') as ThemeMode;
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('app_theme') as ThemeMode;
    return resolveIsDark(saved || 'system');
  });

  // Apply on mount and sync with IndexedDB
  useEffect(() => {
    getSetting<ThemeMode>('theme', theme).then(storedTheme => {
      if (storedTheme && storedTheme !== theme) {
        setThemeState(storedTheme);
        const resolved = resolveIsDark(storedTheme);
        setIsDark(resolved);
        applyDocumentClass(resolved);
      } else {
        const resolved = resolveIsDark(theme);
        setIsDark(resolved);
        applyDocumentClass(resolved);
      }
    });

    // Listen to OS prefers-color-scheme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        setIsDark(e.matches);
        applyDocumentClass(e.matches);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const setTheme = async (mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem('app_theme', mode);
    await setSetting('theme', mode);
    const resolved = resolveIsDark(mode);
    setIsDark(resolved);
    applyDocumentClass(resolved);
  };

  const toggleDark = async () => {
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    await setTheme(nextMode);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme debe ser utilizado dentro de un ThemeProvider');
  }
  return ctx;
};
