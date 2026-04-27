import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

const KEY_AVAILABLE = 'notecard_update_available';
const KEY_VERSION = 'notecard_update_version';
const KEY_IGNORED = 'notecard_update_ignored';

const GITHUB_RELEASES_URL = 'https://github.com/Ja1nHan/Notecard/releases/latest';

interface UpdateState {
  updateAvailable: boolean;
  availableVersion: string | null;
  setUpdateAvailable: (version: string) => void;
  clearUpdate: () => void;
  ignoreUpdate: () => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  updateAvailable: false,
  availableVersion: null,
  setUpdateAvailable: (version) => {
    localStorage.setItem(KEY_AVAILABLE, '1');
    localStorage.setItem(KEY_VERSION, version);
    set({ updateAvailable: true, availableVersion: version });
  },
  clearUpdate: () => {
    localStorage.removeItem(KEY_AVAILABLE);
    localStorage.removeItem(KEY_VERSION);
    set({ updateAvailable: false, availableVersion: null });
  },
  ignoreUpdate: () => {
    const version = get().availableVersion ?? localStorage.getItem(KEY_VERSION);
    if (version) localStorage.setItem(KEY_IGNORED, version);
    localStorage.removeItem(KEY_AVAILABLE);
    localStorage.removeItem(KEY_VERSION);
    set({ updateAvailable: false, availableVersion: null });
  },
}));

export function hasPendingUpdate(): boolean {
  return localStorage.getItem(KEY_AVAILABLE) === '1';
}

export function getPendingVersion(): string | null {
  return localStorage.getItem(KEY_VERSION);
}

export function getIgnoredVersion(): string | null {
  return localStorage.getItem(KEY_IGNORED);
}

export type UpdateStatus = 'checking' | 'downloading' | 'latest' | 'network_error' | 'open_browser'; // 绿色版：已打开浏览器跳转下载页

export async function performUpdate(onStatus?: (s: UpdateStatus) => void): Promise<boolean> {
  onStatus?.('checking');
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();

    if (!update?.available) {
      useUpdateStore.getState().clearUpdate();
      onStatus?.('latest');
      return false;
    }

    // 检测是否为绿色版（exe 同目录存在 .portable 文件）
    const portable = await invoke<boolean>('is_portable').catch(() => false);

    if (portable) {
      // 绿色版不支持静默安装，打开浏览器跳转到发布页让用户手动下载
      await invoke('open_url', { url: GITHUB_RELEASES_URL });
      onStatus?.('open_browser');
      return false;
    }

    // 安装版：正常自动下载并安装
    const { relaunch } = await import('@tauri-apps/plugin-process');
    onStatus?.('downloading');
    useUpdateStore.getState().clearUpdate();
    await update.downloadAndInstall();
    await relaunch();
    return true;
  } catch {
    onStatus?.('network_error');
    return false;
  }
}
