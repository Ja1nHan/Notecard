import { open, save } from '@tauri-apps/plugin-dialog';
import {
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
  readDir,
  remove,
  stat,
} from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { appLocalDataDir, join } from '@tauri-apps/api/path';
import { useAppStore } from '../stores/useAppStore';
import { useFileStore } from '../stores/useFileStore';
import type { NCardFile, NTab, NCard, LockedContent } from '../types/ncard';
import { parseNCardFile } from './ncard-schema';

/** 获取某个文件对应的备份路径 */
async function getBackupPath(filePath: string): Promise<string> {
  const dataDir = await appLocalDataDir();
  const backupDir = await join(dataDir, 'backups');
  const originalName = filePath.split(/[\\/]/).pop() || 'Untitled.ncard';
  return join(backupDir, `${originalName}.bak`);
}

/** 尝试从备份恢复；成功返回数据，失败返回 null */
async function tryRestoreFromBackup(filePath: string): Promise<NCardFile | null> {
  try {
    const bakPath = await getBackupPath(filePath);
    const bakExists = await exists(bakPath);
    if (!bakExists) return null;

    const useBackup = window.confirm('文件已损坏，检测到备份文件。\n是否从备份恢复？');
    if (!useBackup) return null;

    const content = await readTextFile(bakPath);
    const data = parseNCardFile(content);
    // 恢复成功后，同时覆盖修复主文件
    await writeTextFile(filePath, JSON.stringify(data, null, 2));
    return data;
  } catch {
    return null;
  }
}

/** 加载并挂载文件数据到状态 */
function mountFile(data: NCardFile, filePath: string) {
  useAppStore.getState().loadFromFile(data);
  useFileStore.getState().setFileMeta(data.createdAt, data.updatedAt);
  useFileStore.getState().setFilePath(filePath);
  useFileStore.getState().setDirty(false);
  addToRecentFiles(filePath);
}

async function generateNCardFile(): Promise<NCardFile> {
  const appState = useAppStore.getState();
  const fileState = useFileStore.getState();

  const fileLock = appState.fileLock;

  const nTabs: NTab[] = await Promise.all(
    appState.tabs.map(async (t) => {
      if (t.encrypted) {
        if (t.unlocked) {
          // Re-encrypt the unlocked content to get the latest LockedContent
          const lockedContent: LockedContent = await invoke('encrypt_content', {
            plaintext: JSON.stringify(t.cards),
          });
          return {
            id: t.id,
            name: t.name,
            encrypted: true,
            cards: [],
            lockedContent,
          };
        } else {
          // Keep existing lockedContent
          return {
            id: t.id,
            name: t.name,
            encrypted: true,
            cards: [],
            lockedContent: t.lockedContent,
          };
        }
      } else {
        // Unencrypted tab, process its cards
        const nCards: NCard[] = await Promise.all(
          t.cards.map(async (c) => {
            if (c.locked) {
              if (c.cardUnlocked) {
                // Re-encrypt the unlocked card
                const lockedContent: LockedContent = await invoke('encrypt_content', {
                  plaintext: c.body,
                });
                return {
                  id: c.id,
                  title: c.title,
                  color: c.color,
                  collapsed: c.collapsed,
                  locked: true,
                  lockedContent,
                  body: '',
                };
              } else {
                return {
                  id: c.id,
                  title: c.title,
                  color: c.color,
                  collapsed: c.collapsed,
                  locked: true,
                  lockedContent: c.lockedContent,
                  body: '',
                };
              }
            } else {
              return {
                id: c.id,
                title: c.title,
                color: c.color,
                collapsed: c.collapsed,
                locked: false,
                lockedContent: null,
                body: c.body,
              };
            }
          }),
        );

        return {
          id: t.id,
          name: t.name,
          encrypted: false,
          cards: nCards,
          lockedContent: null,
        };
      }
    }),
  );

  return {
    format: 'notecard',
    formatVersion: 1,
    createdAt: fileState.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fileLock,
    tabs: nTabs,
  };
}

function addToRecentFiles(filePath: string) {
  const recent = JSON.parse(localStorage.getItem('notecard_recent_files') || '[]');
  const updated = [filePath, ...recent.filter((p: string) => p !== filePath)].slice(0, 5);
  localStorage.setItem('notecard_recent_files', JSON.stringify(updated));
  // 触发全局事件，供 WelcomeScreen 监听刷新
  window.dispatchEvent(new Event('notecard_recent_files_updated'));
}

export async function createNewFile() {
  const filePath = await save({
    filters: [{ name: 'NoteCard', extensions: ['ncard'] }],
    defaultPath: 'Untitled.ncard',
  });

  if (!filePath) return;

  const now = new Date().toISOString();
  const defaultData: NCardFile = {
    format: 'notecard',
    formatVersion: 1,
    createdAt: now,
    updatedAt: now,
    fileLock: null,
    tabs: [
      {
        id: crypto.randomUUID(),
        name: '默认记录本',
        encrypted: false,
        cards: [],
        lockedContent: null,
      },
    ],
  };

  await writeTextFile(filePath, JSON.stringify(defaultData, null, 2));

  useAppStore.getState().loadFromFile(defaultData);
  useFileStore.getState().setFileMeta(now, now);
  useFileStore.getState().setFilePath(filePath);
  useFileStore.getState().setDirty(false);
  addToRecentFiles(filePath);
}

export async function openFile() {
  const filePath = await open({
    filters: [{ name: 'NoteCard', extensions: ['ncard'] }],
    multiple: false,
  });

  if (!filePath || Array.isArray(filePath)) return;

  try {
    const content = await readTextFile(filePath);
    const data = parseNCardFile(content);
    mountFile(data, filePath);
  } catch {
    // 主文件损坏，尝试从备份恢复
    const restored = await tryRestoreFromBackup(filePath);
    if (restored) {
      mountFile(restored, filePath);
    } else {
      window.alert('文件已损坏且无可用备份。');
    }
  }
}

export async function openFileByPath(filePath: string) {
  const fileExists = await exists(filePath);
  if (!fileExists) return; // 文件不存在，显示欢迎页，不自动恢复

  try {
    const content = await readTextFile(filePath);
    const data = parseNCardFile(content);
    mountFile(data, filePath);
  } catch {
    // 文件存在但已损坏，尝试恢复备份
    const restored = await tryRestoreFromBackup(filePath);
    if (restored) {
      mountFile(restored, filePath);
    } else {
      window.alert('文件已损坏且无可用备份。');
    }
  }
}

export interface BackupInfo {
  bakPath: string;
  originalName: string;
  mtime: Date | null;
  preview: string;
}

function buildPreview(content: string): string {
  try {
    const data = parseNCardFile(content);
    const tabCount = data.tabs?.length ?? 0;
    const cardCount = data.tabs?.reduce((n, t) => n + (t.cards?.length ?? 0), 0) ?? 0;
    const tabNames = data.tabs
      ?.slice(0, 3)
      .map((t) => t.name)
      .filter(Boolean)
      .join('、');
    return `${tabCount} 个类别 · ${cardCount} 张卡片${tabNames ? `（${tabNames}）` : ''}`;
  } catch {
    return '无法解析文件内容';
  }
}

export async function listBackupFiles(): Promise<BackupInfo[]> {
  try {
    const dataDir = await appLocalDataDir();
    const backupDir = await join(dataDir, 'backups');
    if (!(await exists(backupDir))) return [];
    const entries = await readDir(backupDir);
    const results = await Promise.all(
      entries
        .filter((e) => e.name?.endsWith('.ncard.bak'))
        .map(async (e) => {
          const bakPath = await join(backupDir, e.name!);
          const [fileStat, content] = await Promise.all([
            stat(bakPath).catch(() => null),
            readTextFile(bakPath).catch(() => ''),
          ]);
          return {
            bakPath,
            originalName: e.name!.replace(/\.bak$/, ''),
            mtime: fileStat?.mtime ?? null,
            preview: buildPreview(content),
          };
        }),
    );
    return results.sort((a, b) => (b.mtime?.getTime() ?? 0) - (a.mtime?.getTime() ?? 0));
  } catch {
    return [];
  }
}

export async function restoreFromBackupFile(bakPath: string, suggestedName: string) {
  const dataDir = await appLocalDataDir();
  const backupDir = await join(dataDir, 'backups');
  const normalizedBak = bakPath.replace(/\\/g, '/');
  const normalizedBackupDir = backupDir.replace(/\\/g, '/');
  if (!normalizedBak.startsWith(normalizedBackupDir + '/')) {
    throw new Error('Invalid backup path: outside backup directory');
  }

  const savePath = await save({
    filters: [{ name: 'NoteCard', extensions: ['ncard'] }],
    defaultPath: suggestedName,
  });
  if (!savePath) return;
  const content = await readTextFile(bakPath);
  await writeTextFile(savePath, content);
  const data = parseNCardFile(content);
  mountFile(data, savePath);
}

export async function deleteBackupFile(bakPath: string) {
  const dataDir = await appLocalDataDir();
  const backupDir = await join(dataDir, 'backups');
  const normalizedBak = bakPath.replace(/\\/g, '/');
  const normalizedBackupDir = backupDir.replace(/\\/g, '/');
  if (!normalizedBak.startsWith(normalizedBackupDir + '/')) {
    throw new Error('Invalid backup path: outside backup directory');
  }
  await remove(bakPath);
}
export async function saveFile() {
  const filePath = useFileStore.getState().filePath;
  if (!filePath) return;

  try {
    const data = await generateNCardFile();
    useFileStore.getState().setFileMeta(data.createdAt, data.updatedAt);

    const jsonString = JSON.stringify(data, null, 2);

    // 自动备份机制：写入到系统应用数据目录的 backups 文件夹
    try {
      const dataDir = await appLocalDataDir();
      const backupDir = await join(dataDir, 'backups');
      await mkdir(backupDir, { recursive: true });
      const originalName = filePath.split(/[\\/]/).pop() || 'Untitled.ncard';
      const bakPath = await join(backupDir, `${originalName}.bak`);
      await writeTextFile(bakPath, jsonString);
    } catch (e) {
      console.warn('备份文件写入失败:', e);
    }

    // 写入主文件
    await writeTextFile(filePath, jsonString);
    useFileStore.getState().setDirty(false);
  } catch (err) {
    console.error('Failed to save file:', err);
    throw err;
  }
}
