import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';
import { Titlebar } from './components/Titlebar/Titlebar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Toolbar } from './components/Toolbar/Toolbar';
import { CardsGrid } from './components/Cards/CardsGrid';
import { WelcomeScreen } from './components/Welcome/WelcomeScreen';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { ToastContainer } from './components/Toast/Toast';
import { useTheme } from './hooks/useTheme';
import { useFileStore } from './stores/useFileStore';
import { useAppStore } from './stores/useAppStore';
import { useSettingsStore } from './stores/useSettingsStore';
import {
  useUpdateStore,
  hasPendingUpdate,
  getPendingVersion,
  getIgnoredVersion,
  performUpdate,
} from './stores/useUpdateStore';
import { useToastStore } from './hooks/useToast';
import './App.css';

import { openFile, createNewFile, saveFile, openFileByPath } from './lib/file_io';
import { DragProvider } from './lib/DragProvider';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';

// 模块级 flag，防止重入
let isHandlingClose = false;

// 关闭的统一入口：保存 → destroy()
// destroy() 不触发 onCloseRequested，彻底避免循环
export async function requestClose() {
  if (isHandlingClose) return;
  isHandlingClose = true;
  try {
    const { isDirty, filePath } = useFileStore.getState();
    if (isDirty && filePath) {
      await Promise.race([
        saveFile(),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]).catch((e) => console.error('save before close failed:', e));
    }
  } finally {
    try {
      await getCurrentWindow().destroy();
    } catch {
      // destroy 失败时重置 flag，允许用户重试
      isHandlingClose = false;
    }
  }
}

function App() {
  useTheme();
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const filePath = useFileStore((s) => s.filePath);
  const isDirty = useFileStore((s) => s.isDirty);
  const hasFile = filePath !== null;

  const autoLockMinutes = useSettingsStore((s) => s.autoLockMinutes);
  const lockSession = useAppStore((s) => s.lockSession);
  const setUpdateAvailable = useUpdateStore((s) => s.setUpdateAvailable);

  useEffect(() => {
    if (autoLockMinutes === 0) return;
    let timer: number;
    let lastReset = 0;
    // mousemove 每 2 秒最多触发一次 timer 重置，避免高频事件持续分配 timer
    const resetTimer = (throttle = false) => {
      const now = Date.now();
      if (throttle && now - lastReset < 2000) return;
      lastReset = now;
      window.clearTimeout(timer);
      timer = window.setTimeout(
        () => {
          if (useAppStore.getState().sessionUnlocked) {
            lockSession().catch(console.error);
          }
        },
        autoLockMinutes * 60 * 1000,
      );
    };
    const onMouseMove = () => resetTimer(true);
    const onActivity = () => resetTimer(false);
    resetTimer(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('click', onActivity);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('click', onActivity);
    };
  }, [autoLockMinutes, lockSession]);

  useEffect(() => {
    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      if (state.tabs !== prevState.tabs || state.fileLock !== prevState.fileLock) {
        useFileStore.getState().setDirty(true);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // 同步读取本地最近文件路径（不需要等 IPC）
    let localRecentPath: string | null = null;
    try {
      const data = localStorage.getItem('notecard_recent_files');
      if (data) {
        const rf = JSON.parse(data) as string[];
        if (rf.length > 0) localRecentPath = rf[0];
      }
    } catch {}

    // 立即开始加载本地最近文件（与 IPC 并行）
    const localFilePromise: Promise<unknown> = localRecentPath
      ? openFileByPath(localRecentPath).catch(console.error)
      : Promise.resolve(null);

    // IPC 与文件 I/O 并行执行，仅当命令行传入了不同路径时才覆盖
    invoke<string | null>('get_startup_file')
      .then(async (startupPath) => {
        if (startupPath && startupPath !== localRecentPath) {
          // 通过命令行 / 文件关联打开了特定文件，优先加载
          return openFileByPath(startupPath).catch(console.error);
        }
        // 正常启动：等待已经在进行中的本地文件加载
        return localFilePromise;
      })
      .catch(console.error)
      .finally(() => setIsInitializing(false));
  }, []);

  useEffect(() => {
    const unlisten = listen<string>('open-file', (event) => {
      if (typeof event.payload === 'string' && event.payload.endsWith('.ncard')) {
        openFileByPath(event.payload).catch(console.error);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // 自动保存 (防抖 1.5s)
  useEffect(() => {
    if (!isDirty || !hasFile) return;
    const timer = setTimeout(() => {
      saveFile().catch(console.error);
    }, 1500);
    return () => clearTimeout(timer);
  }, [isDirty, hasFile]);

  useEffect(() => {
    const unlisten = listen('tauri://file-drop', (event: any) => {
      const paths = event.payload as string[];
      if (paths?.length > 0 && paths[0].endsWith('.ncard')) {
        openFileByPath(paths[0]).catch(console.error);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Alt+F4 / 任务栏关闭 → 走统一的 requestClose()
  useEffect(() => {
    const unlistenPromise = getCurrentWindow().onCloseRequested((event) => {
      event.preventDefault();
      void requestClose();
    });
    return () => {
      unlistenPromise.then((fn) => fn()).catch(() => {});
    };
  }, []);

  async function handleOpenFile() {
    try {
      await openFile();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleNewFile() {
    try {
      await createNewFile();
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    if (isInitializing) return;

    // 上次检测到有更新，本次启动提示一次（带两个按钮）
    if (hasPendingUpdate()) {
      const version = getPendingVersion();
      setUpdateAvailable(version ?? '');
      useToastStore
        .getState()
        .addToast(
          'info',
          version ? t('app.updateAvailableVersion', { version }) : t('app.updateAvailable'),
          [
            {
              label: t('app.updateNow'),
              onClick: () =>
                performUpdate().then((ok) => {
                  if (!ok) useToastStore.getState().addToast('error', t('app.updateFailed'));
                }),
            },
            { label: t('app.later'), onClick: () => {} },
          ],
        );
    }

    // 软件完全加载后，延迟 10 秒静默检查（不影响启动速度）
    const timer = setTimeout(async () => {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        if (update?.available && update.version !== getIgnoredVersion()) {
          setUpdateAvailable(update.version);
        }
      } catch {
        // 静默失败，不影响用户
      }
    }, 10_000);

    return () => clearTimeout(timer);
  }, [isInitializing, setUpdateAvailable]);

  // 用主题色背景占位，避免 WebView2 白底闪烁
  if (isInitializing)
    return <div style={{ width: '100vw', height: '100vh', background: 'var(--bg)' }} />;

  return (
    <DragProvider>
      <Titlebar />
      {hasFile ? (
        <div className="app-body">
          <Sidebar onOpenSettings={() => setSettingsOpen(true)} />
          <main className="content">
            <Toolbar />
            <div className="cards-area">
              <CardsGrid />
            </div>
          </main>
        </div>
      ) : (
        <div className="app-body">
          <WelcomeScreen
            onOpenFile={handleOpenFile}
            onNewFile={handleNewFile}
            onOpenRecent={(path) => openFileByPath(path).catch(console.error)}
          />
        </div>
      )}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      <ToastContainer />
    </DragProvider>
  );
}

export default App;
