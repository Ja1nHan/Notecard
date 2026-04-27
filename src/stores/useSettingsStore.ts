import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';

interface SettingsState {
  theme: ThemeMode;
  autoLockMinutes: number;
  setTheme: (theme: ThemeMode) => void;
  setAutoLockMinutes: (min: number) => void;
}

const getSavedTheme = (): ThemeMode => {
  const saved = localStorage.getItem('notecard_theme');
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  return 'system';
};

const getSavedAutoLock = (): number => {
  const saved = localStorage.getItem('notecard_autolock');
  if (saved) {
    const num = parseInt(saved, 10);
    if (!isNaN(num)) return num;
  }
  return 10;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: getSavedTheme(),
  autoLockMinutes: getSavedAutoLock(),

  setTheme: (theme) => {
    localStorage.setItem('notecard_theme', theme);
    set({ theme });
  },

  setAutoLockMinutes: (min) => {
    localStorage.setItem('notecard_autolock', min.toString());
    set({ autoLockMinutes: min });
  },
}));
