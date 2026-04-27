import { useEffect } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';

/**
 * 主题切换 hook
 * - 根据 useSettingsStore.theme 在 <html> 上设置 data-theme 属性
 * - theme='system' 时监听系统 prefers-color-scheme 变化
 */
export function useTheme() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (mode: 'light' | 'dark') => {
      root.setAttribute('data-theme', mode);
    };

    if (theme === 'system') {
      // 跟随系统
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mq.matches ? 'dark' : 'light');

      const handler = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else {
      applyTheme(theme);
    }
  }, [theme]);
}
