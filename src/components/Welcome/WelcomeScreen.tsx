import { useState, useEffect } from 'react';
import { FolderOpen, Plus, FileText, History, RotateCcw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  listBackupFiles,
  restoreFromBackupFile,
  deleteBackupFile,
  type BackupInfo,
} from '../../lib/file_io';
import './Welcome.css';

interface WelcomeScreenProps {
  onOpenFile: () => void;
  onNewFile: () => void;
  onOpenRecent: (path: string) => void;
}

export function WelcomeScreen({ onOpenFile, onNewFile, onOpenRecent }: WelcomeScreenProps) {
  const { t, i18n } = useTranslation();
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [backups, setBackups] = useState<BackupInfo[]>([]);

  useEffect(() => {
    const loadRecent = () => {
      try {
        const data = localStorage.getItem('notecard_recent_files');
        if (data) setRecentFiles(JSON.parse(data));
      } catch {}
    };
    loadRecent();
    window.addEventListener('notecard_recent_files_updated', loadRecent);
    return () => window.removeEventListener('notecard_recent_files_updated', loadRecent);
  }, []);

  useEffect(() => {
    listBackupFiles()
      .then(setBackups)
      .catch(() => setBackups([]));
  }, []);

  async function handleRestore(bak: BackupInfo) {
    await restoreFromBackupFile(bak.bakPath, bak.originalName);
    setBackups((prev) => prev.filter((b) => b.bakPath !== bak.bakPath));
  }

  async function handleDelete(bak: BackupInfo) {
    if (!window.confirm(t('welcome.confirmDeleteBackup', { name: bak.originalName }))) return;
    await deleteBackupFile(bak.bakPath);
    setBackups((prev) => prev.filter((b) => b.bakPath !== bak.bakPath));
  }

  // 根据当前语言选择时间格式 locale
  const timeLocale = i18n.language === 'en' ? 'en-US' : i18n.language;

  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="welcome-logo">
          <img src="/app-icon.png" width={64} height={64} alt="NoteCard" />
        </div>
        <h1 className="welcome-title">NoteCard</h1>
        <p className="welcome-desc">{t('welcome.desc')}</p>
        <div className="welcome-actions">
          <button className="welcome-btn primary" onClick={onOpenFile}>
            <FolderOpen />
            {t('welcome.openFile')}
          </button>
          <button className="welcome-btn secondary" onClick={onNewFile}>
            <Plus />
            {t('welcome.newFile')}
          </button>
        </div>

        {recentFiles.length > 0 && (
          <div className="recent-files">
            <div className="recent-title">{t('welcome.recentFiles')}</div>
            <div className="recent-list">
              {recentFiles.map((path, idx) => (
                <div
                  key={idx}
                  className="recent-item"
                  onClick={() => onOpenRecent(path)}
                  title={path}
                >
                  <FileText />
                  <div className="recent-item-path">{path.split(/[\\/]/).pop()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {backups.length > 0 && (
          <div className="recent-files">
            <div className="recent-title">{t('welcome.backups')}</div>
            <div className="recent-list">
              {backups.map((bak) => (
                <div key={bak.bakPath} className="backup-item">
                  <div className="backup-item-header">
                    <History className="backup-icon" />
                    <div className="backup-item-meta">
                      <div className="backup-item-name">{bak.originalName}</div>
                      <div className="backup-item-detail">
                        {bak.mtime
                          ? bak.mtime.toLocaleString(timeLocale, {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : t('welcome.unknownTime')}
                        {' · '}
                        {bak.preview}
                      </div>
                    </div>
                    <button
                      className="backup-action-btn"
                      onClick={() => handleRestore(bak)}
                      title={t('welcome.restoreBackup')}
                    >
                      <RotateCcw />
                    </button>
                    <button
                      className="backup-action-btn danger"
                      onClick={() => handleDelete(bak)}
                      title={t('welcome.deleteBackup')}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
