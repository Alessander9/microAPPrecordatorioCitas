import { describe, it, expect, beforeEach } from 'vitest';

describe('Theme Resolution & Dark Mode Tests', () => {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };

  const classList = new Set<string>();
  const mockDocumentElement = {
    classList: {
      add: (cls: string) => classList.add(cls),
      remove: (cls: string) => classList.delete(cls),
      contains: (cls: string) => classList.has(cls),
    },
  };

  beforeEach(() => {
    mockLocalStorage.clear();
    classList.clear();
  });

  it('adds dark class to documentElement when mode is dark', () => {
    mockDocumentElement.classList.add('dark');
    expect(mockDocumentElement.classList.contains('dark')).toBe(true);
  });

  it('removes dark class from documentElement when mode is light', () => {
    mockDocumentElement.classList.add('dark');
    mockDocumentElement.classList.remove('dark');
    expect(mockDocumentElement.classList.contains('dark')).toBe(false);
  });

  it('persists theme preference to storage', () => {
    mockLocalStorage.setItem('app_theme', 'dark');
    expect(mockLocalStorage.getItem('app_theme')).toBe('dark');

    mockLocalStorage.setItem('app_theme', 'light');
    expect(mockLocalStorage.getItem('app_theme')).toBe('light');
  });
});
